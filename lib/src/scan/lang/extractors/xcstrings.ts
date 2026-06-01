import type { ExtractedHit, LanguageExtractor } from "../types";
import { offsetToLineCol } from "./util";

/**
 * Xcode String Catalog (`.xcstrings`). JSON format introduced in Xcode 15.
 *
 *   {
 *     "sourceLanguage": "en",
 *     "strings": {
 *       "hello": {
 *         "localizations": {
 *           "en": { "stringUnit": { "value": "Hello" } },
 *           "es": { "stringUnit": { "value": "Hola" } }
 *         }
 *       },
 *       "items_plural": {
 *         "localizations": {
 *           "en": {
 *             "variations": {
 *               "plural": {
 *                 "one":   { "stringUnit": { "value": "%d item"  } },
 *                 "other": { "stringUnit": { "value": "%d items" } }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * Every locale present in the file flows through (source + translations);
 * downstream groups candidates by their resource key, which lives in
 * `identifiers`. The locale itself is discoverable from `source_context`
 * (the surrounding JSON shows the `"en":` / `"fr":` / ... wrapping key).
 *
 * Variations (`plural`, `device`, `width`) may be nested arbitrarily; we
 * recurse, accumulating the variant labels into `identifiers` after the
 * top-level key so downstream sees the full path.
 *
 * Positions are tracked by a minimal location-aware JSON parser so each
 * candidate gets a unique (line, column) — required for stable IDs when
 * the same string value appears under multiple keys (e.g. several keys
 * mapping to "OK").
 */
export const xcstringsExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parseJson(source);
    if (!root || root.kind !== "object") return [];

    const out: ExtractedHit[] = [];
    const strings = objectGet(root, "strings");
    if (!strings || strings.kind !== "object") return out;

    for (const entry of strings.entries) {
      const key = entry.key;
      const localizations = entry.value.kind === "object" ? objectGet(entry.value, "localizations") : null;
      if (!localizations || localizations.kind !== "object") continue;
      for (const locale of localizations.entries) {
        if (locale.value.kind !== "object") continue;
        emitLocalization(locale.value, [key], source, out);
      }
    }

    return out;
  },
};

function emitLocalization(node: JsonObject, identifiers: string[], source: string, out: ExtractedHit[]): void {
  const stringUnit = objectGet(node, "stringUnit");
  if (stringUnit && stringUnit.kind === "object") {
    const value = objectGet(stringUnit, "value");
    if (value && value.kind === "string" && value.value.trim().length > 0) {
      out.push({
        value: value.value,
        location: offsetToLineCol(source, value.start),
        context: { parentRole: "resource_value", identifiers },
      });
    }
  }
  const variations = objectGet(node, "variations");
  if (variations && variations.kind === "object") {
    // variations: { plural: { one: {...}, other: {...} }, device: { iphone: {...} }, ... }
    for (const variationType of variations.entries) {
      if (variationType.value.kind !== "object") continue;
      for (const variant of variationType.value.entries) {
        if (variant.value.kind !== "object") continue;
        emitLocalization(variant.value, [...identifiers, variationType.key, variant.key], source, out);
      }
    }
  }
}

interface JsonString {
  kind: "string";
  value: string;
  start: number;
  end: number;
}
interface JsonObject {
  kind: "object";
  entries: Array<{ key: string; value: JsonNode }>;
  start: number;
  end: number;
}
interface JsonArray {
  kind: "array";
  items: JsonNode[];
  start: number;
  end: number;
}
interface JsonAtom {
  kind: "number" | "bool" | "null";
  start: number;
  end: number;
}
type JsonNode = JsonString | JsonObject | JsonArray | JsonAtom;

function objectGet(obj: JsonObject, key: string): JsonNode | null {
  for (const entry of obj.entries) if (entry.key === key) return entry.value;
  return null;
}

/**
 * Lenient JSON parser that records each string's source offset. Returns
 * null if the input isn't valid JSON; callers must check.
 */
function parseJson(source: string): JsonNode | null {
  const ctx = { src: source, i: 0 };
  skipWs(ctx);
  try {
    const node = parseValue(ctx);
    return node;
  } catch {
    return null;
  }
}

interface Ctx {
  src: string;
  i: number;
}

function parseValue(ctx: Ctx): JsonNode {
  skipWs(ctx);
  const ch = ctx.src[ctx.i];
  if (ch === '"') return parseString(ctx);
  if (ch === "{") return parseObject(ctx);
  if (ch === "[") return parseArray(ctx);
  if (ch === "t" || ch === "f") return parseBool(ctx);
  if (ch === "n") return parseNull(ctx);
  return parseNumber(ctx);
}

function parseString(ctx: Ctx): JsonString {
  const start = ctx.i;
  if (ctx.src[ctx.i] !== '"') throw new Error("expected string");
  ctx.i++;
  let value = "";
  while (ctx.i < ctx.src.length) {
    const ch = ctx.src[ctx.i];
    if (ch === "\\") {
      const next = ctx.src[ctx.i + 1];
      ctx.i += 2;
      switch (next) {
        case '"':
          value += '"';
          break;
        case "\\":
          value += "\\";
          break;
        case "/":
          value += "/";
          break;
        case "b":
          value += "\b";
          break;
        case "f":
          value += "\f";
          break;
        case "n":
          value += "\n";
          break;
        case "r":
          value += "\r";
          break;
        case "t":
          value += "\t";
          break;
        case "u": {
          const hex = ctx.src.slice(ctx.i, ctx.i + 4);
          ctx.i += 4;
          value += String.fromCharCode(parseInt(hex, 16));
          break;
        }
        default:
          value += next ?? "";
      }
      continue;
    }
    if (ch === '"') {
      ctx.i++;
      return { kind: "string", value, start, end: ctx.i };
    }
    value += ch;
    ctx.i++;
  }
  throw new Error("unterminated string");
}

function parseObject(ctx: Ctx): JsonObject {
  const start = ctx.i;
  ctx.i++; // {
  skipWs(ctx);
  const entries: Array<{ key: string; value: JsonNode }> = [];
  if (ctx.src[ctx.i] === "}") {
    ctx.i++;
    return { kind: "object", entries, start, end: ctx.i };
  }
  while (ctx.i < ctx.src.length) {
    skipWs(ctx);
    const keyNode = parseString(ctx);
    skipWs(ctx);
    if (ctx.src[ctx.i] !== ":") throw new Error("expected colon");
    ctx.i++;
    const value = parseValue(ctx);
    entries.push({ key: keyNode.value, value });
    skipWs(ctx);
    if (ctx.src[ctx.i] === ",") {
      ctx.i++;
      continue;
    }
    if (ctx.src[ctx.i] === "}") {
      ctx.i++;
      break;
    }
    throw new Error("expected , or }");
  }
  return { kind: "object", entries, start, end: ctx.i };
}

function parseArray(ctx: Ctx): JsonArray {
  const start = ctx.i;
  ctx.i++; // [
  skipWs(ctx);
  const items: JsonNode[] = [];
  if (ctx.src[ctx.i] === "]") {
    ctx.i++;
    return { kind: "array", items, start, end: ctx.i };
  }
  while (ctx.i < ctx.src.length) {
    items.push(parseValue(ctx));
    skipWs(ctx);
    if (ctx.src[ctx.i] === ",") {
      ctx.i++;
      continue;
    }
    if (ctx.src[ctx.i] === "]") {
      ctx.i++;
      break;
    }
    throw new Error("expected , or ]");
  }
  return { kind: "array", items, start, end: ctx.i };
}

function parseBool(ctx: Ctx): JsonAtom {
  const start = ctx.i;
  if (ctx.src.startsWith("true", ctx.i)) ctx.i += 4;
  else if (ctx.src.startsWith("false", ctx.i)) ctx.i += 5;
  else throw new Error("expected bool");
  return { kind: "bool", start, end: ctx.i };
}

function parseNull(ctx: Ctx): JsonAtom {
  const start = ctx.i;
  if (!ctx.src.startsWith("null", ctx.i)) throw new Error("expected null");
  ctx.i += 4;
  return { kind: "null", start, end: ctx.i };
}

function parseNumber(ctx: Ctx): JsonAtom {
  const start = ctx.i;
  const re = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  re.lastIndex = ctx.i;
  const m = re.exec(ctx.src);
  if (!m) throw new Error("expected number");
  ctx.i += m[0].length;
  return { kind: "number", start, end: ctx.i };
}

function skipWs(ctx: Ctx): void {
  while (ctx.i < ctx.src.length) {
    const ch = ctx.src.charCodeAt(ctx.i);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13) ctx.i++;
    else break;
  }
}
