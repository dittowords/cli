import type { DittoScanEnclosingContext } from "../types";

export interface ExtractedHit {
  value: string;
  location: { line: number; column: number }; // 1-based
  context: DittoScanEnclosingContext;
}

// Escape hatch for languages that don't fit the engine's spec-driven path
// (the regex fallback and SFC formats like Vue).
export interface LanguageExtractor {
  extract(opts: { source: string; kind: string }): Promise<ExtractedHit[]>;
}
