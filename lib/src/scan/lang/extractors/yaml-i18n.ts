import { parseDocument } from "yaml";

import type { ExtractedHit, LanguageExtractor } from "../types";

// YAML i18n files — vue-i18n YAML mode, Rails `config/locales`, etc.
// Same conventions as the JSON i18n extractor: descend into maps, emit
// each leaf string keyed by its path. `item_one` / `item_other` style
// plural suffixes are split into `[base, variant]`. parseDocument is
// used (over yaml.parse) for source positions on each scalar.
//
// No content-shape gate — the walker only dispatches this on files the
// LLM has already confirmed.
export const yamlI18nExtractor: LanguageExtractor = {
  async extract({ source }) {
    let doc: ReturnType<typeof parseDocument>;
    try {
      doc = parseDocument(source);
    } catch {
      return [];
    }
    if (doc.errors && doc.errors.length > 0) return [];

    const out: ExtractedHit[] = [];
    walk(doc.contents as YamlNode | null, [], source, out);
    return out;
  },
};

const PLURAL_SUFFIX_RE = /^(.+)_(zero|one|two|few|many|other)$/;

// Minimal shape of the `yaml` v1 nodes we touch — the package's own
// types pull in more than we need.
interface YamlScalar {
  value: unknown;
  range?: [number, number] | null;
}
interface YamlPair {
  key?: YamlScalar;
  value?: YamlNode;
}
interface YamlMap {
  items: YamlPair[];
}
interface YamlSeq {
  items: YamlNode[];
}
type YamlNode = YamlScalar | YamlMap | YamlSeq | null | undefined;

function isMap(node: YamlNode): node is YamlMap {
  return !!node && Array.isArray((node as YamlMap).items) && hasPairItems(node as YamlMap);
}

function isSeq(node: YamlNode): node is YamlSeq {
  if (!node || !Array.isArray((node as YamlSeq).items)) return false;
  const items = (node as YamlSeq).items;
  if (items.length === 0) return !hasPairItems(node as unknown as YamlMap);
  const first = items[0];
  return !(first !== null && typeof first === "object" && "key" in first);
}

function hasPairItems(node: YamlMap): boolean {
  // A YAMLSeq also has `.items`, but its items aren't pair-shaped.
  return (
    node.items.length === 0 || (node.items[0] !== null && typeof node.items[0] === "object" && "key" in node.items[0])
  );
}

function isScalar(node: YamlNode): node is YamlScalar {
  return !!node && typeof (node as YamlScalar).value !== "undefined" && !("items" in (node as object));
}

function walk(node: YamlNode, path: string[], source: string, out: ExtractedHit[]): void {
  if (!node) return;
  if (isMap(node)) {
    for (const pair of node.items) {
      if (!pair.key || typeof pair.key.value !== "string") continue;
      walk(pair.value, [...path, pair.key.value], source, out);
    }
    return;
  }
  if (isSeq(node)) {
    for (let i = 0; i < node.items.length; i++) {
      walk(node.items[i], [...path, String(i)], source, out);
    }
    return;
  }
  if (isScalar(node) && typeof node.value === "string") {
    if (node.value.trim().length === 0) return;
    let identifiers = path;
    if (path.length > 0) {
      const m = PLURAL_SUFFIX_RE.exec(path[path.length - 1]);
      if (m) identifiers = [...path.slice(0, -1), m[1], m[2]];
    }
    const start = node.range ? node.range[0] : 0;
    out.push({
      value: node.value,
      location: offsetToLineCol(source, start),
      context: { parentRole: "resource_value", identifiers },
    });
  }
  // Non-string scalars: not the leaf shape we emit on.
}

function offsetToLineCol(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  const limit = Math.min(offset, source.length);
  for (let i = 0; i < limit; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: Math.max(1, offset - lastNewline) };
}
