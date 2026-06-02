import { Lang, parse, type SgNode } from "@ast-grep/napi";

import type { ExtractedHit, LanguageExtractor } from "../types";
import { extractHtmlMarkup } from "./html-markup";
import { javascriptExtractor } from "./javascript";

/**
 * Vue Single-File Component (SFC) extractor. A `.vue` file has three
 * top-level blocks:
 *
 *   <template>      <!-- HTML-ish markup with Vue directives          -->
 *   <script>...     // JS or TS module that exports the component
 *   <style>...      /* Scoped CSS. We never scan this.               *\/
 *
 * Strategy: parse the whole file as HTML, then handle each block.
 *
 *   1. Template or top-level HTML. Emit the text content of every
 *      element (`<p>Hello</p>` becomes `Hello`) and the value of every
 *      plain attribute (`<input placeholder="Email"/>` becomes `Email`).
 *      Vue directives (`:foo`, `@click`, `v-bind`, `#slot`) are skipped
 *      because their "values" are actually JS expressions, not text.
 *   2. `<script>`. Re-parse its contents using the JS/TS extractor.
 *   3. `<style>`. Skipped entirely. CSS is never user-facing copy.
 */
export const vueExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parse(Lang.Html, source).root();
    const out: ExtractedHit[] = extractHtmlMarkup(source);
    for (const script of root.findAll({ rule: { kind: "script_element" } })) {
      out.push(...(await emitScript(script)));
    }

    return out;
  },
};

/**
 * Run the embedded `<script>` body through the JavaScript extractor.
 *
 * Trick: we left-pad the script body with newlines and spaces so the
 * character positions inside the padded slice line up with the original
 * SFC. That way the JS extractor's reported line and column numbers
 * point straight back into the `.vue` file without any per-hit offset
 * math.
 */
async function emitScript(script: SgNode): Promise<ExtractedHit[]> {
  const rawText = script.children().find((c) => c.kind() === "raw_text");
  if (!rawText || rawText.text().trim().length === 0) return [];

  const langId = detectScriptLang(script);
  const start = rawText.range().start;
  const padded = "\n".repeat(start.line) + " ".repeat(start.column) + rawText.text();
  return javascriptExtractor(langId).extract({ source: padded, kind: "vue-script" });
}

/**
 * Read the `lang` attribute off the `<script>` opening tag to decide
 * which JS grammar to use:
 *
 *   <script>                       JavaScript
 *   <script lang="ts">              TypeScript
 *   <script lang="typescript">      TypeScript
 *   <script lang="tsx">             Tsx
 *
 * Anything else (including `lang="js"`) falls back to JavaScript.
 */
function detectScriptLang(script: SgNode): Lang {
  for (const tag of script.children()) {
    if (tag.kind() !== "start_tag") continue;
    for (const attr of tag.children()) {
      if (attr.kind() !== "attribute") continue;
      const named = attr.children().filter((c) => c.isNamed());
      const name = named
        .find((c) => c.kind() === "attribute_name")
        ?.text()
        .toLowerCase();
      if (name !== "lang") continue;
      const value = named
        .find((c) => c.kind() === "quoted_attribute_value")
        ?.children()
        .find((c) => c.kind() === "attribute_value")
        ?.text()
        .toLowerCase();
      if (value === "ts" || value === "typescript") return Lang.TypeScript;
      if (value === "tsx") return Lang.Tsx;
    }
  }
  return Lang.JavaScript;
}
