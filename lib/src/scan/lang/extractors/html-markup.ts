import { Lang, parse, type SgNode } from "@ast-grep/napi";

import type { ExtractedHit, LanguageExtractor } from "../types";

// Tags whose contents are code-shaped, not human copy. If the candidate
// sits inside any of these up the ancestor chain we suppress parentTag so
// the markup_text accept rule falls through to the LLM.
const CODE_LIKE_HTML_ANCESTORS: ReadonlySet<string> = new Set(["pre", "code", "kbd", "samp", "var", "script", "style"]);
const INTERPOLATION_LITERAL_RE = /(["'`])((?:\\.|(?!\1).)+?)\1/g;

export const htmlMarkupExtractor: LanguageExtractor = {
  async extract({ source }) {
    return extractHtmlMarkup(source);
  },
};

export function extractHtmlMarkup(source: string): ExtractedHit[] {
  const root = parse(Lang.Html, source).root();
  const out: ExtractedHit[] = [];

  for (const el of root.findAll({ rule: { kind: "element" } })) {
    if (isInsideScriptOrStyle(el)) continue;
    emitElementMarkup(el, out);
  }

  return out;
}

/**
 * `<script>` and `<style>` contents are not markup copy. SFC extractors can
 * parse script bodies separately with the appropriate language grammar.
 */
function isInsideScriptOrStyle(node: SgNode): boolean {
  for (let cur = node.parent(); cur; cur = cur.parent()) {
    const k = cur.kind();
    if (k === "script_element" || k === "style_element") return true;
  }
  return false;
}

/**
 * For one HTML element, emit:
 *
 *   1. One hit per plain attribute value.
 *   2. One hit per non-empty direct text child.
 *
 * Framework-specific directives are skipped because their values are code
 * expressions, not literal product copy.
 */
function emitElementMarkup(el: SgNode, out: ExtractedHit[]): void {
  const elementTag = elementTagName(el);
  const parentTag = hasCodeLikeHtmlAncestor(el) ? undefined : elementTag;
  for (const child of el.children()) {
    const k = child.kind();
    if (k === "start_tag" || k === "self_closing_tag") {
      for (const attr of child.children()) {
        if (attr.kind() === "attribute") emitAttribute(attr, out);
      }
    } else if (k === "text") {
      emitText(child, parentTag, out);
    }
  }
}

function emitText(textNode: SgNode, parentTag: string | undefined, out: ExtractedHit[]): void {
  const text = textNode.text();
  if (text.trim().length === 0) return;

  // Template languages often put literal fallback/display copy inside
  // interpolation expressions:
  //   {{ isFollowing ? 'Unfollow' : 'Follow' }}
  //   {{ _('%(count)d followers') }}
  // Emit those inner literals instead of the whole code expression.
  if (isTemplateExpressionText(text)) {
    const extracted = emitInterpolationLiterals(textNode, parentTag, out);
    if (extracted > 0) return;
  }

  const start = textNode.range().start;
  out.push({
    value: text,
    location: { line: start.line + 1, column: start.column + 1 },
    context: { parentRole: "markup_text", identifiers: [], parentTag },
  });
}

function isTemplateExpressionText(text: string): boolean {
  return /[{%][{%]|[%}][}%]/.test(text);
}

function emitInterpolationLiterals(textNode: SgNode, parentTag: string | undefined, out: ExtractedHit[]): number {
  const text = textNode.text();
  const start = textNode.range().start;
  let count = 0;
  for (const match of text.matchAll(INTERPOLATION_LITERAL_RE)) {
    const value = match[2];
    if (value.trim().length === 0) continue;
    const offset = (match.index ?? 0) + 1;
    const loc = offsetToLineCol(text, offset);
    out.push({
      value,
      location: {
        line: start.line + loc.line,
        column: loc.line === 0 ? start.column + loc.column + 1 : loc.column + 1,
      },
      context: { parentRole: "markup_text", identifiers: [], parentTag },
    });
    count++;
  }
  return count;
}

function offsetToLineCol(source: string, offset: number): { line: number; column: number } {
  let line = 0;
  let lastNl = -1;
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, column: offset - lastNl - 1 };
}

function elementTagName(el: SgNode): string | undefined {
  for (const c of el.children()) {
    if (c.kind() !== "start_tag" && c.kind() !== "self_closing_tag") continue;
    for (const inner of c.children()) {
      if (inner.kind() === "tag_name") return inner.text().toLowerCase();
    }
  }
  return undefined;
}

function hasCodeLikeHtmlAncestor(el: SgNode): boolean {
  for (let cur: SgNode | null = el.parent(); cur; cur = cur.parent()) {
    if (cur.kind() !== "element") continue;
    const tag = elementTagName(cur);
    if (tag && CODE_LIKE_HTML_ANCESTORS.has(tag)) return true;
  }
  return false;
}

function emitAttribute(attr: SgNode, out: ExtractedHit[]): void {
  const named = attr.children().filter((c) => c.isNamed());
  const nameNode = named.find((c) => c.kind() === "attribute_name");
  if (!nameNode) return;
  const rawName = nameNode.text();
  if (isDirectiveAttribute(rawName)) return;

  let valueNode: SgNode | undefined;
  let valueText: string | null = null;
  for (const c of named) {
    if (c.kind() === "quoted_attribute_value") {
      valueNode = c;
      valueText =
        c
          .children()
          .find((cc) => cc.kind() === "attribute_value")
          ?.text() ?? "";
      break;
    }
    if (c.kind() === "attribute_value") {
      valueNode = c;
      valueText = c.text();
      break;
    }
  }
  if (valueText === null) return; // Boolean attribute (e.g., `disabled`).

  const start = (valueNode ?? attr).range().start;
  out.push({
    value: valueText,
    location: { line: start.line + 1, column: start.column + 1 },
    context: { parentRole: "markup_attr", identifiers: [rawName.toLowerCase()] },
  });
}

function isDirectiveAttribute(name: string): boolean {
  return /^[:@#]|^v-|^\*|^\[|^\(|^bind-|^on-/.test(name);
}
