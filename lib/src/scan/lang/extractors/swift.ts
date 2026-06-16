import { parse, type SgNode } from "@ast-grep/napi";

import type { DittoScanEnclosingContext } from "../../types";
import type { ExtractedHit, LanguageExtractor } from "../types";

/**
 * Swift string-literal node kinds.
 *
 *   `line_string_literal`        `"..."`            (with `\(expr)` interpolation)
 *   `multi_line_string_literal`  `"""..."""`
 *   `raw_string_literal`         `#"..."#`, `##"..."##`, etc.
 */
const STRING_KINDS = [
  "line_string_literal",
  "multi_line_string_literal",
  "raw_string_literal",
] as const;

export const swiftExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse("swift", source).root();
    const out: ExtractedHit[] = [];

    for (const kind of STRING_KINDS) {
      for (const node of root.findAll({ rule: { kind } })) {
        // `"\(name)"` puts inner string literals (if any) under an
        // `interpolated_expression`. We emit only the outer literal; the
        // inner shows up as part of its source text.
        if (isInsideInterpolation(node)) continue;
        const { line, column } = node.range().start;
        out.push({
          value: node.text(),
          location: { line: line + 1, column: column + 1 },
          context: classifySwiftParent(node),
        });
      }
    }

    return out;
  },
};

function isInsideInterpolation(node: SgNode): boolean {
  for (let cur = node.parent(); cur; cur = cur.parent()) {
    if (cur.kind() === "interpolated_expression") return true;
  }
  return false;
}

/**
 * Cheap, confident exclusions only. Anything we don't classify falls
 * through as `other` and the LLM reads `source_context`.
 *
 *   `import`         `import Foundation`
 *   `regex_pattern`  `NSRegularExpression(pattern: "...")`, `Regex("...")`
 *   `object_key`     `["k": v]` literal-position key
 *   `index_access`   `dict["k"]`
 *   `type_tag`       `x == "foo"`, `switch x { case "foo": ... }`,
 *                    enum raw values (`case x = "foo"`),
 *                    Swift attribute arguments (`@objc("name")`).
 */
function classifySwiftParent(node: SgNode): DittoScanEnclosingContext {
  const parent = node.parent();
  if (!parent) return { parentRole: "other", identifiers: [] };
  const pk = parent.kind() as string;

  switch (pk) {
    case "import_declaration":
      return { parentRole: "import", identifiers: [] };

    case "equality_expression":
      return { parentRole: "type_tag", identifiers: [] };

    // `enum E: String { case a = "alpha" }` — raw values are tags, not text.
    case "enum_entry":
      return { parentRole: "type_tag", identifiers: [] };

    // `@objc("Name")`, `@available(...)`, etc. The string sits directly
    // inside the `attribute` node alongside the user_type identifying it.
    case "attribute":
      return { parentRole: "type_tag", identifiers: [] };

    // `["k": v, ...]`. Keys and values alternate as named children.
    // Even-indexed named children are keys; odd are values.
    case "dictionary_literal": {
      const named = parent.children().filter((c) => c.isNamed());
      const idx = named.findIndex((c) => rangesMatch(c, node));
      return {
        parentRole: idx >= 0 && idx % 2 === 0 ? "object_key" : "other",
        identifiers: [],
      };
    }

    // `switch s { case "foo": ... }` parses as
    //   switch_entry → switch_pattern → pattern → line_string_literal
    case "pattern": {
      const grand = parent.parent();
      if (grand?.kind() === "switch_pattern")
        return { parentRole: "type_tag", identifiers: [] };
      return { parentRole: "other", identifiers: [] };
    }

    // Function call or subscript argument. tree-sitter-swift folds both
    // `f(x)` and `obj[x]` into `call_expression` and distinguishes them
    // by the opener token on `value_arguments` (`(` vs `[`).
    case "value_argument": {
      const args = parent.parent(); // value_arguments
      const suffix = args?.parent(); // call_suffix
      const call = suffix?.parent(); // call_expression
      if (call?.kind() === "call_expression") {
        const opener = args
          ?.children()
          .find((c) => !c.isNamed())
          ?.text();
        if (opener === "[")
          return { parentRole: "index_access", identifiers: [] };

        const head = firstNamedChild(call);
        const bareName =
          head?.kind() === "simple_identifier" ? head.text() : null;
        if (bareName === "NSRegularExpression" || bareName === "Regex") {
          return { parentRole: "regex_pattern", identifiers: [] };
        }
        const { callee, calleeMember, methodName } = extractSwiftCallee(head);
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

    default:
      return { parentRole: "other", identifiers: [] };
  }
}

function firstNamedChild(node: SgNode): SgNode | null {
  for (const c of node.children()) if (c.isNamed()) return c;
  return null;
}

/**
 * Pull identifying pieces off a Swift call_expression head. Mirrors the
 * Kotlin extractor's `extractKtCallee` and follows the same contract:
 *
 *   `callee` / `calleeMember`  — set only when the receiver is a bare
 *     identifier (or the call has no receiver). Strict; reject rules can
 *     trust the receiver identity.
 *   `methodName`               — set whenever the head is a navigation_
 *     expression with a final method identifier, regardless of receiver
 *     shape. Accept rules can match chained setter calls like
 *     `button.setTitle("X", for: .normal)` or `someView.someChild.text(...)`.
 *
 * Examples:
 *
 *   `print("x")`                          callee="print"
 *   `NSLog("x")`                          callee="NSLog"
 *   `button.setTitle("x", for: .normal)`  callee="button", calleeMember="setTitle", methodName="setTitle"
 *   `Logger.shared.info("x")`             methodName="info"        (receiver is itself a navigation)
 */
function extractSwiftCallee(head: SgNode | null): {
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
 * child. Handles the wrapped `navigation_suffix` shape (`foo.bar` where
 * the suffix wraps a `simple_identifier` for `bar`) and the bare
 * `simple_identifier` shape.
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
