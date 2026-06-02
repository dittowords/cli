import type { LanguageExtractor } from "../types";
import { jsonI18nExtractor } from "./json-i18n";

/**
 * Flutter Application Resource Bundles (`.arb`). ARB is plain JSON with one
 * convention: keys prefixed with `@` are metadata, not product copy.
 *
 *   {
 *     "@@locale": "en",
 *     "hello": "Hello",
 *     "@hello": { "description": "greeting", "placeholders": {...} }
 *   }
 *
 * `@@locale` / `@@last_modified` are file-level metadata; `@<key>` holds the
 * description and placeholder spec for `<key>`. Reuse the JSON walker and
 * drop any hit whose identifier chain crosses an `@`-prefixed key.
 */
export const arbExtractor: LanguageExtractor = {
  async extract(opts) {
    const hits = await jsonI18nExtractor.extract(opts);
    return hits.filter((h) => !h.context.identifiers.some((id) => id.startsWith("@")));
  },
};
