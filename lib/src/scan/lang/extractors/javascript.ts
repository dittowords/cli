import { Lang, parse, type SgNode } from "@ast-grep/napi";

import type { DittoScanEnclosingContext } from "../../types";
import type { ExtractedHit, LanguageExtractor } from "../types";
import { decodeEscapes } from "./util";
import { extractHtmlMarkup } from "./html-markup";

/**
 * AST node kinds we treat as candidate strings.
 *
 *   `string`           covers `"..."` and `'...'`.
 *   `template_string`  covers backticks, including ones with `${...}`
 *                      substitutions. We just keep the raw text.
 *   `jsx_text`         is the text content between JSX tags. For example,
 *                      the `Save` in `<button>Save</button>`.
 */
const STRING_KINDS = ["string", "template_string", "jsx_text"] as const;

/**
 * Build an extractor for one of the JavaScript-family grammars supported
 * by ast-grep:
 *
 *   `Lang.JavaScript`  for plain `.js`, `.cjs`, `.mjs` (no JSX).
 *   `Lang.TypeScript`  for `.ts`, `.cts`, `.mts` (types but no JSX).
 *   `Lang.Tsx`         for `.tsx` and `.jsx`. ast-grep's JS grammar does
 *                      not parse JSX, so we use the Tsx grammar for both.
 *
 * The returned extractor walks the AST, emits one `ExtractedHit` per
 * string node, and tags each hit with what kind of position it's in. See
 * `classifyJsParent` for the keep/drop decisions.
 */
export function javascriptExtractor(langId: Lang): LanguageExtractor {
  return {
    async extract({ source }) {
      const root = parse(langId, source).root();
      const out: ExtractedHit[] = [];

      for (const kind of STRING_KINDS) {
        for (const node of root.findAll({ rule: { kind } })) {
          if (
            node.kind() === "template_string" &&
            isInlineMarkupTemplateValue(node)
          ) {
            const htmlHits = extractInlineMarkupTemplate(node);
            if (htmlHits.length > 0) {
              out.push(...htmlHits);
              continue;
            }
          }
          const value = nodeValue(node);
          if (value === null) continue;
          const { line, column } = node.range().start;
          out.push({
            value,
            snapshotText: node.text(),
            location: { line: line + 1, column: column + 1 },
            context: classifyJsParent(node),
          });
        }
      }

      return out;
    },
  };
}

function extractInlineMarkupTemplate(node: SgNode): ExtractedHit[] {
  const raw = node.text();
  if (raw.length < 2 || raw[0] !== "`" || raw[raw.length - 1] !== "`")
    return [];
  const body = raw.slice(1, -1);
  if (!looksLikeMarkup(body)) return [];

  const start = node.range().start;
  const padded = "\n".repeat(start.line) + " ".repeat(start.column + 1) + body;
  return extractHtmlMarkup(padded);
}

function looksLikeMarkup(value: string): boolean {
  return /<\/?[A-Za-z][^>]*>/.test(value);
}

function isInlineMarkupTemplateValue(node: SgNode): boolean {
  const parent = node.parent();
  if (parent?.kind() !== "pair") return false;
  const named = parent.children().filter((c) => c.isNamed());
  const key = named[0];
  const value = named[named.length - 1];
  return rangesMatch(value, node) && keyName(key) === "template";
}

function keyName(node: SgNode | undefined): string | null {
  if (!node) return null;
  if (node.kind() === "property_identifier" || node.kind() === "identifier")
    return node.text();
  if (node.kind() === "string") {
    const text = node.text();
    return text.length >= 2 ? text.slice(1, -1) : text;
  }
  return null;
}

/**
 * Source text for the node, or null for whitespace-only `jsx_text`. Escapes are
 * decoded (left raw, an exporter escapes them again) but only for real JS
 * literals — a backslash isn't an escape in `jsx_text` or a bare JSX attribute.
 */
function nodeValue(node: SgNode): string | null {
  const text = node.text();
  if (node.kind() === "jsx_text") {
    return text.trim().length === 0 ? null : text;
  }
  // A bare JSX attribute is HTML-shaped: a backslash isn't an escape there.
  if (node.parent()?.kind() === "jsx_attribute") return text;
  return decodeEscapes(text);
}

/**
 * Look at the AST node that contains the string and decide what kind of
 * position the string is sitting in. The output drives two things:
 *
 *   1. The keep/drop decision in `shouldEmit`. Five `parentRole` values
 *      are in the excluded set and never reach the LLM:
 *
 *        `import`         `import x from "y"`, `require("y")`, etc.
 *        `regex_pattern`  `new RegExp("...")`
 *        `object_key`     `{ "key": value }`
 *        `index_access`   `obj["key"]`
 *        `type_tag`       `case "foo":`, `x === "foo"`,
 *                         `type T = "foo"`, etc.
 *
 *   2. The hints surfaced to the LLM: `markup_text`, `markup_attr` (with
 *      the attribute name in `identifiers`), or `other`.
 *
 * Anything we don't recognize falls through to `other`. The LLM has the
 * source context, so we don't need to classify every shape. We just need
 * to be confident about the cheap exclusions.
 */
function classifyJsParent(node: SgNode): DittoScanEnclosingContext {
  // jsx_text is always direct content inside a JSX element. No need to
  // walk the parent chain to find the parent role, but we do walk up to
  // capture the wrapping tag name so the markup_text accept rule can
  // honor its parent-tag denylist (`<code>`, `<pre>`, ...).
  if (node.kind() === "jsx_text") {
    return {
      parentRole: "markup_text",
      identifiers: [],
      parentTag: enclosingJsxTag(node),
    };
  }

  const parent = node.parent();
  if (!parent) return { parentRole: "other", identifiers: [] };
  const pk = parent.kind() as string;

  switch (pk) {
    // Rare. A bare string literal directly under a JSX element. Most JSX
    // content arrives via jsx_text (handled above) or jsx_expression.
    case "jsx_element":
      return {
        parentRole: "markup_text",
        identifiers: [],
        parentTag: enclosingJsxTag(node),
      };

    // `{expr}` braces inside JSX. The interesting question is what the
    // braces themselves are nested in:
    //
    //   <p>{"Hello"}</p>                  markup_text
    //   <input placeholder={"Email"}/>    markup_attr (placeholder)
    //   const x = {"foo"};                other (not real JSX)
    case "jsx_expression": {
      const grand = parent.parent();
      const gk = grand?.kind();
      if (gk === "jsx_element") {
        return {
          parentRole: "markup_text",
          identifiers: [],
          parentTag: enclosingJsxTag(node),
        };
      }
      if (gk === "jsx_attribute") {
        const name = jsxAttributeName(grand!);
        return {
          parentRole: "markup_attr",
          identifiers: name ? [name.toLowerCase()] : [],
        };
      }
      return { parentRole: "other", identifiers: [] };
    }

    // Direct attribute value: <input placeholder="Email" />. We surface
    // the attribute name so `shouldEmit` can drop structural attrs like
    // `className`, `style`, `data-testid`, etc.
    case "jsx_attribute": {
      const name = jsxAttributeName(parent);
      return {
        parentRole: "markup_attr",
        identifiers: name ? [name.toLowerCase()] : [],
      };
    }

    // The string is a function call argument. `arguments` is the parent
    // for `foo(...)`, `new Foo(...)`, and `import(...)`. We special-case
    // a few known shapes:
    //
    //   new RegExp("...")    regex_pattern (dropped)
    //   require("...")       import (dropped)
    //   import("...")        import (dropped, dynamic import)
    //
    // Everything else (`t("..")`, `throw new Error("..")`, etc.) is
    // `other`. We tag it with the callee identifier when the receiver is
    // a bare identifier, so the rule classifier can match `console.log`,
    // `JSON.parse`, etc., without affecting the LLM-visible payload.
    case "arguments": {
      const call = parent.parent();
      const head = call ? firstNamedChild(call) : null;
      if (call?.kind() === "new_expression") {
        if (head?.kind() === "identifier" && head.text() === "RegExp") {
          return { parentRole: "regex_pattern", identifiers: [] };
        }
      } else if (call?.kind() === "call_expression") {
        if (head?.kind() === "identifier" && head.text() === "require") {
          return { parentRole: "import", identifiers: [] };
        }
        if (head?.kind() === "import") {
          return { parentRole: "import", identifiers: [] };
        }
      }
      const { callee, calleeMember } = extractJsCallee(head);
      return { parentRole: "other", identifiers: [], callee, calleeMember };
    }

    // Object literal entry: `{ key: value }`. ast-grep models both the
    // key and the value as children of a `pair` node, so we check
    // whether our string IS the first named child (the key) or sits in
    // the value slot.
    //
    //   { "label": "Hello" }    "label" is object_key (dropped),
    //                           "Hello" is other (emitted)
    case "pair": {
      const firstNamed = firstNamedChild(parent);
      const isKey = firstNamed && rangesMatch(firstNamed, node);
      return { parentRole: isKey ? "object_key" : "other", identifiers: [] };
    }

    // `obj["key"]`. The string is being used as a property name lookup,
    // never user-facing.
    case "subscript_expression":
      return { parentRole: "index_access", identifiers: [] };

    // `x === "foo"` and the !=/==/!== variants. This is almost always a
    // type or tag narrowing check against a fixed token, not displayable
    // text. We detect the equality operator by looking for an unnamed
    // child token matching the operator. Anything else under a
    // binary_expression (for example `prefix + "suffix"` for string
    // concat) is ambiguous, so we let it through as `other`.
    case "binary_expression":
      for (const child of parent.children()) {
        if (!child.isNamed() && /^(===?|!==?)$/.test(child.text())) {
          return { parentRole: "type_tag", identifiers: [] };
        }
      }
      return { parentRole: "other", identifiers: [] };

    // `case "foo":` and `default:`. Switch discriminants are tags, not
    // user-facing text.
    case "switch_case":
    case "switch_default":
      return { parentRole: "type_tag", identifiers: [] };

    // All forms of import/export specifier and module path. The string
    // here is a module path, never user-facing.
    //
    //   import x from "y";   import { x } from "y";   require("y");
    //   export * from "y";   export { x } from "y";
    case "import_statement":
    case "import_specifier":
    case "import_clause":
    case "import_require_clause":
    case "namespace_import":
    case "export_statement":
    case "export_specifier":
      return { parentRole: "import", identifiers: [] };

    // TypeScript type-level positions. Strings here are part of the type
    // system, not runtime text.
    //
    //   type T = "foo";                          (literal_type / type_alias_declaration)
    //   type T = "a" | "b";                      (union_type)
    //   type T = ["a", "b"];                     (tuple_type)
    //   type T = { a: "x" } & { b: "y" };        (intersection_type)
    case "literal_type":
    case "type_alias_declaration":
    case "tuple_type":
    case "union_type":
    case "intersection_type":
      return { parentRole: "type_tag", identifiers: [] };

    // Anything we don't have a specific opinion about: variable
    // declarations, return statements, throw arguments, JSX children
    // arrays, ternaries, etc. The LLM gets these as `other` and reads
    // the source.
    default:
      return { parentRole: "other", identifiers: [] };
  }
}

/** First child that's a real grammar node. Skips punctuation tokens. */
function firstNamedChild(node: SgNode): SgNode | null {
  for (const c of node.children()) if (c.isNamed()) return c;
  return null;
}

/**
 * Pull the callee identifier(s) off a call_expression / new_expression head.
 * Only recognizes top-level identifiers — `foo(...)` and `Foo.bar(...)`
 * where `Foo` is itself a bare identifier. `this.log.warn(...)`,
 * `Logger().info(...)`, and other deeper chains return `{}` so the rule
 * classifier sees no callee and falls through to the LLM.
 */
function extractJsCallee(head: SgNode | null): {
  callee?: string;
  calleeMember?: string;
} {
  if (!head) return {};
  if (head.kind() === "identifier") return { callee: head.text() };
  if (head.kind() === "member_expression") {
    const named = head.children().filter((c) => c.isNamed());
    if (named.length < 2) return {};
    const receiver = named[0];
    const property = named[named.length - 1];
    if (receiver.kind() === "identifier") {
      return { callee: receiver.text(), calleeMember: property.text() };
    }
  }
  return {};
}

/** True iff two nodes cover exactly the same source range. */
function rangesMatch(a: SgNode, b: SgNode): boolean {
  const ra = a.range();
  const rb = b.range();
  return ra.start.index === rb.start.index && ra.end.index === rb.end.index;
}

/** Text of an attribute's name child: `placeholder` from `placeholder="…"`. */
function jsxAttributeName(attr: SgNode): string | null {
  return firstNamedChild(attr)?.text() ?? null;
}

// JSX/HTML tags whose contents are code-shaped, not human copy.
// If the candidate sits inside one of these anywhere up the chain we
// suppress parentTag entirely so `markup_text_safe` falls through to the
// LLM, even when the innermost wrapping tag is something like `<span>`
// (common in syntax-highlighted code blocks: `<pre><span>...</span></pre>`).
const CODE_LIKE_JSX_ANCESTORS: ReadonlySet<string> = new Set([
  "pre",
  "code",
  "kbd",
  "samp",
  "var",
  "script",
  "style",
]);

/**
 * For a string-bearing node sitting under JSX, find the immediate
 * wrapping `jsx_element` and return its tag name, lowercased.
 * Returns undefined for:
 *
 *   - Fragments `<>…</>` (no tag name)
 *   - Component element names like `<Foo.Bar>` (member expressions);
 *     the markup_text rule keys on lowercase HTML tag names anyway, so
 *     missing one of these just routes to the LLM, which is the safe
 *     default.
 *   - Nodes inside a code-shaped ancestor (`<pre>`, `<code>`, etc.) even
 *     when the innermost wrapping tag is otherwise a copy-bearing tag.
 */
function enclosingJsxTag(node: SgNode): string | undefined {
  let candidate = node.parent();
  if (candidate?.kind() === "jsx_expression") candidate = candidate.parent();
  if (candidate?.kind() !== "jsx_element") return undefined;
  if (hasCodeLikeJsxAncestor(candidate)) return undefined;
  const opening = candidate
    .children()
    .find((c) => c.kind() === "jsx_opening_element");
  if (!opening) return undefined;
  for (const c of opening.children()) {
    if (c.kind() === "identifier" || c.kind() === "jsx_identifier")
      return c.text().toLowerCase();
  }
  return undefined;
}

function hasCodeLikeJsxAncestor(jsxElement: SgNode): boolean {
  for (let cur: SgNode | null = jsxElement.parent(); cur; cur = cur.parent()) {
    if (cur.kind() !== "jsx_element") continue;
    const opening = cur
      .children()
      .find((c) => c.kind() === "jsx_opening_element");
    if (!opening) continue;
    for (const c of opening.children()) {
      if (c.kind() !== "identifier" && c.kind() !== "jsx_identifier") continue;
      if (CODE_LIKE_JSX_ANCESTORS.has(c.text().toLowerCase())) return true;
      break;
    }
  }
  return false;
}
