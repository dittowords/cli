import type { ExtractedHit, LanguageExtractor } from "../types";
import { decodeEscapes, offsetToLineCol } from "./util";

/**
 * iOS `.strings` files (Localizable.strings, InfoPlist.strings, etc.).
 *
 * Format is a sequence of `"key" = "value";` pairs with `// line` and
 * `/* block *\/` comments. There's no AST grammar shipped for this in
 * @ast-grep/napi, and the format is simple enough that a hand-rolled
 * lexer is the cleanest path. Every value is intentional user-facing
 * copy, so every pair emits a `resource_value` hit. Escapes (`\"`,
 * `\n`, etc.) are kept verbatim in the value — mirrors the JS extractor
 * which keeps `template_string` source as-is.
 */
export const stringsExtractor: LanguageExtractor = {
  async extract({ source }) {
    const out: ExtractedHit[] = [];
    for (const pair of parseStringsFile(source)) {
      out.push({
        value: decodeEscapes(pair.value),
        location: pair.location,
        context: { parentRole: "resource_value", identifiers: [pair.key] },
        i18nKey: pair.key,
      });
    }
    return out;
  },
};

interface StringPair {
  key: string;
  value: string;
  location: { line: number; column: number };
}

function parseStringsFile(source: string): StringPair[] {
  const out: StringPair[] = [];
  let i = 0;

  while (i < source.length) {
    i = skipWhitespaceAndComments(source, i);
    if (i >= source.length) break;
    if (source[i] !== '"') {
      // Recover from malformed input: skip one character and retry.
      i++;
      continue;
    }

    const key = readQuoted(source, i);
    if (!key) break;
    i = key.endIndex;

    i = skipWhitespaceAndComments(source, i);
    if (source[i] !== "=") continue;
    i++;

    i = skipWhitespaceAndComments(source, i);
    if (source[i] !== '"') continue;

    const value = readQuoted(source, i);
    if (!value) break;

    out.push({
      key: key.content,
      value: value.content,
      location: offsetToLineCol(source, value.startIndex),
    });
    i = value.endIndex;

    i = skipWhitespaceAndComments(source, i);
    if (source[i] === ";") i++;
  }

  return out;
}

function skipWhitespaceAndComments(source: string, start: number): number {
  let i = start;
  while (i < source.length) {
    const ch = source.charCodeAt(i);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
      i++;
      continue;
    }
    if (source[i] === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (source[i] === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) return source.length;
      i = end + 2;
      continue;
    }
    break;
  }
  return i;
}

interface QuotedRead {
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Read a `"..."` token, honoring `\` escapes so an embedded `\"` does
 * not terminate the string. The `content` excludes the surrounding
 * quotes; escape sequences are kept literally in the returned text.
 */
function readQuoted(source: string, openQuote: number): QuotedRead | null {
  if (source[openQuote] !== '"') return null;
  let i = openQuote + 1;
  let content = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\" && i + 1 < source.length) {
      content += ch + source[i + 1];
      i += 2;
      continue;
    }
    if (ch === '"') {
      return { content, startIndex: openQuote, endIndex: i + 1 };
    }
    content += ch;
    i++;
  }
  return null;
}
