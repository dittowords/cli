import { Lang, parse, type SgNode } from "@ast-grep/napi";

import type { ExtractedHit, LanguageExtractor } from "../types";
import { offsetToLineCol } from "./util";
import { elementAttribute, emitTextHit, findCdataElements, tagName } from "./xml";

/**
 * Android `res/values/*.xml` resource files. Three top-level shapes:
 *
 *   <string name="hello">Hello, world!</string>
 *   <plurals name="items">
 *     <item quantity="one">%d item</item>
 *     <item quantity="other">%d items</item>
 *   </plurals>
 *   <string-array name="planets">
 *     <item>Mercury</item>
 *     <item>Venus</item>
 *   </string-array>
 *
 * Every value is intentional product copy, so all hits flow out as
 * `resource_value`. The resource key (and the variant for plurals or the
 * index for arrays) is surfaced through `identifiers` so downstream sees
 * what's going on without re-parsing.
 */
export const androidResourceExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse(Lang.Html, source).root();
    const out: ExtractedHit[] = [];

    for (const el of root.findAll({ rule: { kind: "element" } })) {
      const tag = tagName(el);
      if (tag === "string") {
        emitStringElement(el, out, source);
      } else if (tag === "plurals" || tag === "string-array") {
        const parentName = elementAttribute(el, "name") ?? "";
        let index = 0;
        for (const child of el.children()) {
          if (child.kind() !== "element" || tagName(child) !== "item") continue;
          const variant = tag === "plurals" ? elementAttribute(child, "quantity") ?? "" : String(index);
          // The resource name is the lookup key; quantity/index are selectors.
          emitTextHit(child, [parentName, variant], out, source, parentName || undefined);
          index++;
        }
      }
    }

    emitCdataValues(source, out);

    return out;
  },
};

const NAME_ATTR_RE = /\bname\s*=\s*"([^"]*)"/;
const QUANTITY_ATTR_RE = /\bquantity\s*=\s*"([^"]*)"/;

function emitCdataValues(source: string, out: ExtractedHit[]): void {
  for (const m of findCdataElements(source, ["string", "item"])) {
    const name = NAME_ATTR_RE.exec(m.attrsRaw)?.[1];
    const quantity = QUANTITY_ATTR_RE.exec(m.attrsRaw)?.[1];
    const parent = m.tag === "item" ? findEnclosingResourceParent(source, m.offset) : null;
    if (m.tag === "item" && !parent) continue;
    const { line, column } = offsetToLineCol(source, m.valueOffset);
    out.push({
      value: m.value,
      location: { line, column },
      context: {
        parentRole: "resource_value",
        identifiers: buildItemIdentifiers({ name, quantity, parent }),
      },
      i18nKey: name || parent || undefined,
    });
  }
}

function buildItemIdentifiers({
  name,
  quantity,
  parent,
}: {
  name: string | undefined;
  quantity: string | undefined;
  parent: string | null;
}): string[] {
  // `<string name="...">` CDATA: name carries the identity directly.
  if (name) return quantity ? [name, quantity] : [name];
  // `<item>` CDATA inside <plurals>/<string-array>: use the enclosing parent's
  // name so the identifier matches the non-CDATA path's [parentName, variant].
  // The array-item index isn't reconstructable from a regex sweep, so plain
  // <string-array> items collapse to just [parentName].
  if (parent) return quantity ? [parent, quantity] : [parent];
  return quantity ? [quantity] : [];
}

// Walks open/close tags up to `before` and returns the `name` of the
// innermost active `<plurals>`/`<string-array>` ancestor, or null if there
// is no enclosing one.
function findEnclosingResourceParent(source: string, before: number): string | null {
  const re = /<(plurals|string-array)\b([^>]*)>|<\/(plurals|string-array)>/g;
  const stack: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m.index >= before) break;
    if (m[1]) stack.push(NAME_ATTR_RE.exec(m[2])?.[1] ?? "");
    else stack.pop();
  }
  return stack[stack.length - 1] ?? null;
}

function emitStringElement(el: SgNode, out: ExtractedHit[], source: string): void {
  const name = elementAttribute(el, "name");
  emitTextHit(el, name ? [name] : [], out, source, name ?? undefined);
}
