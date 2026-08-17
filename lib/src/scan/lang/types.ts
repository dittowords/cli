import type { DittoScanEnclosingContext } from "../types";

export interface ExtractedHit {
  value: string;
  location: { line: number; column: number }; // 1-based
  context: DittoScanEnclosingContext;
  snapshotText?: string;
  // The string's lookup key as written in its localization resource file
  // ("labels.paste", "item_one", a PO msgid, an Android resource name, …).
  // Set only by resource-file extractors; unlike `context.identifiers`,
  // which folds in variant/plural selectors, this is the literal key.
  i18nKey?: string;
  // Per-hit locale for formats that hold many locales in one file
  // (.xcstrings). When set, it wins over the file-level locale derived
  // from the path.
  localeKey?: string;
}

// Escape hatch for languages that don't fit the engine's spec-driven path
// (the regex fallback and SFC formats like Vue).
export interface LanguageExtractor {
  extract(opts: { source: string; kind: string }): Promise<ExtractedHit[]>;
}
