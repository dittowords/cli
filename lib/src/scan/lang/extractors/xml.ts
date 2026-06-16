import { type SgNode } from "@ast-grep/napi";

import type { ExtractedHit } from "../types";

export function tagName(element: SgNode): string | null {
  const start = element.children().find((c) => c.kind() === "start_tag");
  return (
    start
      ?.children()
      .find((c) => c.kind() === "tag_name")
      ?.text() ?? null
  );
}

export function elementAttribute(element: SgNode, name: string): string | null {
  const start = element.children().find((c) => c.kind() === "start_tag");
  if (!start) return null;
  for (const attr of start.children()) {
    if (attr.kind() !== "attribute") continue;
    const nameNode = attr.children().find((c) => c.kind() === "attribute_name");
    if (nameNode?.text() !== name) continue;
    const quoted = attr.children().find((c) => c.kind() === "quoted_attribute_value");
    const value = quoted
      ?.children()
      .find((c) => c.kind() === "attribute_value")
      ?.text();
    if (value !== undefined) return value;
    return (
      attr
        .children()
        .find((c) => c.kind() === "attribute_value")
        ?.text() ?? null
    );
  }
  return null;
}

// Emit a `resource_value` hit from `element`'s first text child. No-op when
// the element has no direct text node, the text is whitespace-only, or the
// element contains a CDATA section (handled by `findCdataElements`). The
// HTML grammar parses CDATA inconsistently when its body looks like markup
// — `<![CDATA[Hi <b>x</b>]]>` can surface `]]` as a stray text node.
// Skipping any element whose source range contains `<![CDATA[` is simpler
// and matches the CDATA sweep, which recovers the real value.
export function emitTextHit(
  element: SgNode,
  identifiers: string[],
  out: ExtractedHit[],
  source?: string,
  i18nKey?: string
): void {
  if (source !== undefined && elementContainsCdata(element, source)) return;
  const text = element.children().find((c) => c.kind() === "text");
  if (!text) return;
  const value = text.text();
  if (value.trim().length === 0) return;
  const range = text.range();
  out.push({
    value,
    location: { line: range.start.line + 1, column: range.start.column + 1 },
    context: { parentRole: "resource_value", identifiers },
    i18nKey,
  });
}

function elementContainsCdata(element: SgNode, source: string): boolean {
  const range = element.range();
  const idx = source.indexOf("<![CDATA[", range.start.index);
  return idx !== -1 && idx < range.end.index;
}

export interface CdataMatch {
  tag: string;
  attrsRaw: string;
  value: string;
  // Offset of the matched outer tag, e.g. `<source ...><![CDATA[...]]></source>`.
  offset: number;
  // Offset of the CDATA payload itself (the char after `<![CDATA[`). Use this
  // for hit locations so they point at the extracted text rather than the tag.
  valueOffset: number;
}

const CDATA_MARKER = "<![CDATA[";

// ast-grep's HTML grammar drops CDATA text nodes silently, so an AST walk
// over `<value><![CDATA[...]]></value>` sees no text child at all. This
// regex sweep recovers those by name. The AST pass never captures CDATA in
// the first place, so there's no overlap — no dedup needed.
export function findCdataElements(source: string, tagNames: readonly string[]): CdataMatch[] {
  if (tagNames.length === 0) return [];
  const alt = tagNames.map(escapeRegex).join("|");
  const re = new RegExp(`<(${alt})\\b([^>]*)>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</\\1>`, "g");
  const out: CdataMatch[] = [];
  for (const m of source.matchAll(re)) {
    if (m[3] === "") continue;
    const offset = m.index ?? 0;
    // Hop past `<tag attrs>` and any whitespace to find the `<![CDATA[` opener.
    const cdataPos = m[0].indexOf(CDATA_MARKER);
    const valueOffset = cdataPos === -1 ? offset : offset + cdataPos + CDATA_MARKER.length;
    out.push({ tag: m[1], attrsRaw: m[2], value: m[3], offset, valueOffset });
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
