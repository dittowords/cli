import { Lang, parse, type SgNode } from "@ast-grep/napi";

import type { ExtractedHit, LanguageExtractor } from "../types";

/**
 * iOS `.stringsdict` plurals file. The format is plist XML:
 *
 *   <plist>
 *     <dict>
 *       <key>%d items</key>          <- top-level localization key
 *       <dict>
 *         <key>NSStringLocalizedFormatKey</key>
 *         <string>%#@items@</string>  <- a real format string
 *         <key>items</key>
 *         <dict>
 *           <key>NSStringFormatSpecTypeKey</key>
 *           <string>NSStringPluralRuleType</string>  <- metadata, skip
 *           <key>one</key>
 *           <string>%d item</string>   <- a real plural variant
 *           <key>other</key>
 *           <string>%d items</string>  <- a real plural variant
 *         </dict>
 *       </dict>
 *     </dict>
 *   </plist>
 *
 * Strategy: walk the dict tree pairwise (`<key>K</key>` followed by the
 * value element). Only emit `<string>` values when their immediate key
 * is one of the CLDR plural categories or `NSStringLocalizedFormatKey`.
 * Everything else (`NSStringFormatSpecTypeKey`, type tokens, etc.) is
 * configuration metadata, not user-facing text.
 */
const USER_FACING_KEYS: ReadonlySet<string> = new Set([
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
  "NSStringLocalizedFormatKey",
]);

export const stringsdictExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse(Lang.Html, source).root();
    const out: ExtractedHit[] = [];

    for (const dict of root.findAll({ rule: { kind: "element" } })) {
      if (tagName(dict) !== "dict") continue;
      // Only walk top-level dicts; the recursive call handles nesting.
      if (hasAncestorTag(dict, "dict")) continue;
      walkDict(dict, [], out);
    }

    return out;
  },
};

function walkDict(dictEl: SgNode, path: string[], out: ExtractedHit[]): void {
  const items = dictEl.children().filter((c) => c.kind() === "element");
  for (let i = 0; i + 1 < items.length; i += 2) {
    const keyEl = items[i];
    const valueEl = items[i + 1];
    if (tagName(keyEl) !== "key") continue;
    const key = elementText(keyEl);
    if (key === null) continue;
    const tag = tagName(valueEl);
    if (tag === "dict") {
      walkDict(valueEl, [...path, key], out);
    } else if (tag === "string") {
      if (!USER_FACING_KEYS.has(key)) continue;
      const value = elementText(valueEl);
      if (value === null || value.trim().length === 0) continue;
      const textNode = valueEl.children().find((c) => c.kind() === "text");
      const range = (textNode ?? valueEl).range();
      out.push({
        value,
        location: { line: range.start.line + 1, column: range.start.column + 1 },
        context: { parentRole: "resource_value", identifiers: [...path, key] },
        // The top-level dict key is the localization lookup key; deeper
        // segments (format-spec name, plural category) are structure.
        i18nKey: path[0],
      });
    }
  }
}

function tagName(el: SgNode): string | null {
  const start = el.children().find((c) => c.kind() === "start_tag");
  return (
    start
      ?.children()
      .find((c) => c.kind() === "tag_name")
      ?.text() ?? null
  );
}

function elementText(el: SgNode): string | null {
  const text = el.children().find((c) => c.kind() === "text");
  return text?.text() ?? null;
}

function hasAncestorTag(node: SgNode, name: string): boolean {
  for (let cur = node.parent(); cur; cur = cur.parent()) {
    if (cur.kind() === "element" && tagName(cur) === name) return true;
  }
  return false;
}
