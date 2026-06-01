import { Lang, parse } from "@ast-grep/napi";

import type { ExtractedHit, LanguageExtractor } from "../types";
import { offsetToLineCol } from "./util";
import { elementAttribute, emitTextHit, findCdataElements, tagName } from "./xml";

/**
 * XLIFF translation interchange (`.xliff` / `.xlf`). Two on-the-wire shapes:
 *
 *   1.2: <trans-unit id="hello"><source>Hello</source><target>Bonjour</target></trans-unit>
 *   2.0: <unit id="hello"><segment><source>Hello</source><target>Bonjour</target></segment></unit>
 *
 * Each `<source>` and `<target>` text is emitted as `resource_value`, tagged
 * with `[unitId, "source"|"target"]`. `<note>` (translator comments) and
 * metadata elements are skipped. CDATA-wrapped content is recovered via a
 * regex sweep — ast-grep's HTML grammar drops CDATA text nodes.
 */
export const xliffExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse(Lang.Html, source).root();
    const out: ExtractedHit[] = [];

    for (const unit of root.findAll({ rule: { kind: "element" } })) {
      const tag = tagName(unit);
      if (tag !== "trans-unit" && tag !== "unit") continue;
      const id = elementAttribute(unit, "id") ?? "";
      for (const el of unit.findAll({ rule: { kind: "element" } })) {
        const innerTag = tagName(el);
        if (innerTag !== "source" && innerTag !== "target") continue;
        emitTextHit(el, [id, innerTag], out, source);
      }
    }

    emitCdataValues(source, out);
    return out;
  },
};

// CDATA sweep can't see the surrounding <trans-unit id=...> easily — the
// regex only captures the immediate parent (<source>/<target>). The unit id
// is left blank for these; downstream still groups by value.
function emitCdataValues(source: string, out: ExtractedHit[]): void {
  for (const m of findCdataElements(source, ["source", "target"])) {
    const { line, column } = offsetToLineCol(source, m.valueOffset);
    out.push({
      value: m.value,
      location: { line, column },
      context: { parentRole: "resource_value", identifiers: ["", m.tag] },
    });
  }
}
