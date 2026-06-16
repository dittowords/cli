import type { ExtractedHit, LanguageExtractor } from "../types";
import { offsetToLineCol } from "./util";

/**
 * Web i18n JSON catalogs. Covers the formats used by i18next, react-intl /
 * formatjs, react-i18next, vue-i18n, next-intl, etc.
 *
 * Two top-level shapes are accepted:
 *
 *   Flat (formatjs / react-intl default):
 *     { "home.title": "Welcome", "home.subtitle": "Sign in" }
 *
 *   Nested (i18next default):
 *     { "labels": { "paste": "Paste" }, "errors": { "fileTooBig": "..." } }
 *
 * Plural variants come in three flavours:
 *   - i18next suffix:  { "item_one": "1 item", "item_other": "{count} items" }
 *   - i18next nested:  { "item": { "one": "1 item", "other": "{count} items" } }
 *   - ICU MessageFormat: { "item": "{count, plural, one {# item} other {# items}}" }
 *
 * The suffix form is split into [base, variant] so it surfaces the same way
 * as the nested form ([key, variant]). ICU strings are emitted as a single
 * candidate without parsing the body — the downstream LLM phase handles it.
 *
 * Positions come from a location-aware JSON parser so identical string
 * values under different keys still get unique (line, column) — required
 * for stable candidate ids.
 */
// No content-shape gate: the walker only dispatches this extractor on
// files the LLM has already confirmed as i18n, so we emit every string
// leaf even when localized text is mixed with numeric/array metadata.
export const jsonI18nExtractor: LanguageExtractor = {
  async extract({ source }) {
    const root = parseJson(source);
    if (!root || root.kind !== "object") return [];
    const out: ExtractedHit[] = [];
    walk(root, [], source, out);
    return out;
  },
};

const PLURAL_SUFFIX_RE = /^(.+)_(zero|one|two|few|many|other)$/;

function walk(node: JsonNode, path: string[], source: string, out: ExtractedHit[]): void {
  if (node.kind === "string") {
    if (node.value.trim().length === 0) return;
    let identifiers = path;
    if (path.length > 0) {
      const m = PLURAL_SUFFIX_RE.exec(path[path.length - 1]);
      if (m) identifiers = [...path.slice(0, -1), m[1], m[2]];
    }
    out.push({
      value: node.value,
      location: offsetToLineCol(source, node.start),
      context: { parentRole: "resource_value", identifiers },
      // The literal key path — keeps the plural suffix ("item_one") that
      // `identifiers` splits into [base, variant].
      i18nKey: path.length > 0 ? path.join(".") : undefined,
    });
    return;
  }
  if (node.kind === "object") {
    for (const entry of node.entries) {
      walk(entry.value, [...path, entry.key], source, out);
    }
    return;
  }
  if (node.kind === "array") {
    for (let i = 0; i < node.items.length; i++) {
      walk(node.items[i], [...path, String(i)], source, out);
    }
  }
  // Numbers, bool, null: not user-facing copy at the leaf level.
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

function parseJson(source: string): JsonNode | null {
  const ctx = { src: source, i: 0 };
  skipWs(ctx);
  try {
    const node = parseValue(ctx);
    skipWs(ctx);
    if (ctx.i !== ctx.src.length) return null;
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
