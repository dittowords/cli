import { Lang, parse, type SgNode } from "@ast-grep/napi";

import type { ExtractedHit, LanguageExtractor } from "../types";
import { offsetToLineCol } from "./util";
import { elementAttribute, emitTextHit, tagName } from "./xml";

/**
 * .NET resource files (`.resx` / `.resw`). Format:
 *
 *   <root>
 *     <resheader name="version"><value>2.0</value></resheader>     <!-- file metadata -->
 *     <data name="hello" xml:space="preserve">
 *       <value>Hello</value>
 *       <comment>greeting</comment>
 *     </data>
 *     <data name="logo" type="System.Resources.ResXFileRef, ...">  <!-- non-string -->
 *       <value>logo.png;System.Drawing.Bitmap, ...</value>
 *     </data>
 *     <data name="blob" mimetype="application/x-microsoft.net.object.bytearray.base64">
 *       <value>iVBORw0KGgo...</value>                               <!-- binary -->
 *     </data>
 *   </root>
 *
 * Emit `<value>` text for `<data>` entries with neither `type` nor
 * `mimetype` set (the string-valued ones). `<resheader>` and `<comment>`
 * children are skipped.
 */
export const resxExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse(Lang.Html, source).root();
    const out: ExtractedHit[] = [];

    for (const el of root.findAll({ rule: { kind: "element" } })) {
      if (tagName(el) !== "data") continue;
      if (elementAttribute(el, "type") !== null) continue;
      if (elementAttribute(el, "mimetype") !== null) continue;
      const name = elementAttribute(el, "name") ?? "";
      const valueEl = findChildElement(el, "value");
      if (!valueEl) continue;
      emitTextHit(valueEl, [name], out, source);
    }

    emitCdataValues(source, out);
    return out;
  },
};

function findChildElement(parent: SgNode, name: string): SgNode | null {
  for (const child of parent.children()) {
    if (child.kind() !== "element") continue;
    if (tagName(child) === name) return child;
  }
  return null;
}

// CDATA recovery for `<data name="..."><value><![CDATA[...]]></value>…</data>`.
// Has to be parent-aware (regex includes the surrounding <data>) to read the
// `name` and to skip typed/binary entries whose CDATA isn't user-facing copy.
// `[\s\S]*?` between </value> and </data> tolerates sibling children like
// <comment>.
const DATA_CDATA_RE = /<data\b([^>]*)>\s*<value\b[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/value>[\s\S]*?<\/data>/g;
const CDATA_MARKER = "<![CDATA[";
const NAME_ATTR_RE = /\bname\s*=\s*"([^"]*)"/;
const TYPE_ATTR_RE = /\btype\s*=\s*"/;
const MIMETYPE_ATTR_RE = /\bmimetype\s*=\s*"/;

function emitCdataValues(source: string, out: ExtractedHit[]): void {
  for (const m of source.matchAll(DATA_CDATA_RE)) {
    const attrs = m[1];
    if (TYPE_ATTR_RE.test(attrs) || MIMETYPE_ATTR_RE.test(attrs)) continue;
    const value = m[2];
    if (value === "") continue;
    const name = NAME_ATTR_RE.exec(attrs)?.[1] ?? "";
    const matchOffset = m.index ?? 0;
    const cdataPos = m[0].indexOf(CDATA_MARKER);
    const valueOffset = cdataPos === -1 ? matchOffset : matchOffset + cdataPos + CDATA_MARKER.length;
    const { line, column } = offsetToLineCol(source, valueOffset);
    out.push({
      value,
      location: { line, column },
      context: { parentRole: "resource_value", identifiers: [name] },
    });
  }
}
