import { parse, type SgNode } from "@ast-grep/napi";

import type { DittoScanEnclosingContext } from "../../types";
import type { ExtractedHit, LanguageExtractor } from "../types";
import { decodeEscapes } from "./util";

/**
 * Kotlin string extractor. Tree-sitter's Kotlin grammar models all
 * string forms (`"..."`, `"""..."""`, and interpolated `"hi $x"`) as a
 * single `string_literal` node. We emit one hit per literal and let the
 * raw source — interpolation markers and all — flow through unchanged,
 * the same way the JS extractor handles `template_string`.
 *
 * Character literals (`'a'`) are not strings and are skipped.
 */
export const kotlinExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse("kotlin", source).root();
    const out: ExtractedHit[] = [];

    for (const node of root.findAll({ rule: { kind: "string_literal" } })) {
      // Skip nested string literals inside interpolations — they will be
      // visited as their own top-level hit by the same `findAll` scan.
      if (isInsideInterpolation(node)) continue;
      const { line, column } = node.range().start;
      const text = node.text();
      // Raw strings (`"""..."""`) don't process escapes.
      const decoded = text.startsWith('"""') ? text : decodeEscapes(text);
      out.push({
        value: decoded,
        location: { line: line + 1, column: column + 1 },
        context: classifyKtParent(node),
      });
    }

    return out;
  },
};

/**
 * `"outer ${ "inner" }"` produces two `string_literal` nodes — the
 * outer one and the inner one inside the `interpolated_expression`.
 * We want the outer literal only; the inner is part of its source text.
 */
function isInsideInterpolation(node: SgNode): boolean {
  for (let cur = node.parent(); cur; cur = cur.parent()) {
    if (cur.kind() === "interpolated_expression") return true;
  }
  return false;
}

/**
 * Look at the AST node that contains the string and decide what kind of
 * position the string is sitting in. Mirrors `classifyJsParent` in
 * `javascript.ts`: cheap, confident exclusions only. Everything we don't
 * have an opinion about falls through to `other` and the LLM gets to
 * read `source_context`.
 *
 *   `import`         `import com.foo.Bar`, `package com.foo`
 *   `regex_pattern`  `Regex("...")`
 *   `object_key`     `"key" to value` in `mapOf(...)` and other pair builders
 *   `index_access`   `map["key"]`
 *   `type_tag`       `x == "foo"`, `when (x) { "foo" -> ... }`,
 *                    annotation arguments (`@Foo("x")`)
 */
function classifyKtParent(node: SgNode): DittoScanEnclosingContext {
  const parent = node.parent();
  if (!parent) return { parentRole: "other", identifiers: [] };
  const pk = parent.kind() as string;

  switch (pk) {
    case "package_header":
    case "import_header":
      return { parentRole: "import", identifiers: [] };

    case "equality_expression":
      return { parentRole: "type_tag", identifiers: [] };

    case "when_condition":
      return { parentRole: "type_tag", identifiers: [] };

    case "indexing_suffix":
      return { parentRole: "index_access", identifiers: [] };

    // `"k" to v` inside `mapOf(...)`. The infix operator is the
    // identifier `to`; if our string is the left operand it's a key.
    case "infix_expression": {
      const opIsTo = parent
        .children()
        .filter((c) => c.kind() === "simple_identifier")
        .some((c) => c.text() === "to");
      if (!opIsTo) return { parentRole: "other", identifiers: [] };
      const firstNamed = firstNamedChild(parent);
      const isLeft = firstNamed !== null && rangesMatch(firstNamed, node);
      return { parentRole: isLeft ? "object_key" : "other", identifiers: [] };
    }

    // Direct argument to a call. We special-case the `Regex("...")`
    // constructor; everything else (`println("...")`, `Log.d(...)`,
    // `Text("Compose hello")`, ...) is `other` but gets tagged with the
    // bare-identifier callee so reject/accept rules can match.
    case "value_argument": {
      const args = parent.parent(); // value_arguments
      const suffix = args?.parent(); // call_suffix
      const call = suffix?.parent(); // call_expression
      if (call?.kind() === "call_expression") {
        const head = firstNamedChild(call);
        if (head?.kind() === "simple_identifier" && head.text() === "Regex") {
          return { parentRole: "regex_pattern", identifiers: [] };
        }
        const { callee, calleeMember, methodName } = extractKtCallee(head);
        if (callee || methodName) {
          return {
            parentRole: "other",
            identifiers: [],
            callee,
            calleeMember,
            methodName,
          };
        }
      }
      return { parentRole: "other", identifiers: [] };
    }

    // Annotation arguments parse as a `prefix_expression` whose children
    // are the `annotation` (just `@Name`) and a `parenthesized_expression`
    // holding the actual args. Anything sitting inside that paren group is
    // an annotation argument.
    case "parenthesized_expression": {
      const grand = parent.parent();
      if (grand?.kind() === "prefix_expression") {
        const hasAnnotation = grand
          .children()
          .some((c) => c.kind() === "annotation");
        if (hasAnnotation) return { parentRole: "type_tag", identifiers: [] };
      }
      return { parentRole: "other", identifiers: [] };
    }

    default:
      return { parentRole: "other", identifiers: [] };
  }
}

function firstNamedChild(node: SgNode): SgNode | null {
  for (const c of node.children()) if (c.isNamed()) return c;
  return null;
}

/**
 * Pull identifying pieces off a Kotlin call_expression head. Returns three
 * fields with different match strictness:
 *
 *   `callee` / `calleeMember`  — set only when the receiver is a bare
 *     identifier (or absent). Strict; used by reject rules where receiver
 *     certainty matters.
 *   `methodName`               — set whenever the head is a navigation_
 *     expression with a final method identifier, regardless of receiver
 *     shape. Lets accept rules match chained calls like
 *     `AlertDialog.Builder(ctx).setTitle("X")` or `label.setText("X")`.
 *
 * Examples:
 *
 *   `println("x")`                   callee="println"
 *   `Log.d(TAG, "x")`                callee="Log", calleeMember="d", methodName="d"
 *   `Timber.d("x")`                  callee="Timber", calleeMember="d", methodName="d"
 *   `myObj.warn("x")`                callee="myObj", calleeMember="warn", methodName="warn"
 *   `Builder(ctx).setTitle("x")`     methodName="setTitle"        (no callee — receiver is a call)
 *   `foo.bar.baz("x")`               methodName="baz"             (no callee — receiver is a navigation)
 *
 * The receiver-is-bare trade-off on `callee`/`calleeMember` is unchanged:
 * an instance variable named `Log` or `Timber` would still misclassify
 * (variables of those names would be unusual).
 */
function extractKtCallee(head: SgNode | null): {
  callee?: string;
  calleeMember?: string;
  methodName?: string;
} {
  if (!head) return {};
  if (head.kind() === "simple_identifier") return { callee: head.text() };
  if (head.kind() === "navigation_expression") {
    const named = head.children().filter((c) => c.isNamed());
    if (named.length < 2) return {};
    const receiver = named[0];
    const last = named[named.length - 1];
    const methodName = navigationFinalIdentifier(last);
    if (!methodName) return {};
    if (receiver.kind() === "simple_identifier") {
      return { callee: receiver.text(), calleeMember: methodName, methodName };
    }
    return { methodName };
  }
  return {};
}

/**
 * Read the trailing identifier off a navigation_expression's last named
 * child. Handles both the `simple_identifier` case (`foo.bar` where the
 * final child is `bar`) and the wrapped `navigation_suffix` case
 * (`foo.bar` parsed with the suffix containing `bar` as its inner
 * identifier).
 */
function navigationFinalIdentifier(last: SgNode): string | undefined {
  if (last.kind() === "simple_identifier") return last.text();
  if (last.kind() === "navigation_suffix") {
    const inner = last
      .children()
      .filter((c) => c.isNamed() && c.kind() === "simple_identifier")[0];
    if (inner) return inner.text();
  }
  return undefined;
}

function rangesMatch(a: SgNode, b: SgNode): boolean {
  const ra = a.range();
  const rb = b.range();
  return ra.start.index === rb.start.index && ra.end.index === rb.end.index;
}
