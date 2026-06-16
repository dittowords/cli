import { z } from "zod";

// The LLM's verdict on a candidate.
export const DittoScanStatusSchema = z.enum([
  "user-facing",
  "not-user-facing",
  "unsure",
  "error",
]);
export type DittoScanStatus = z.infer<typeof DittoScanStatusSchema>;

// The syntactic site a string was found in. Kinds in the first group are
// always excluded by `shouldEmit` and never appear on emitted candidates;
// they exist so extractors and exclusion rules share a vocabulary.
export const DittoScanDetectionKindSchema = z.enum([
  // Excluded by `shouldEmit`
  "import",
  "regex_pattern",
  "object_key",
  "index_access",
  "type_tag",

  // Emitted
  "markup_text", // text content of a JSX/HTML-like element
  "markup_attr", // value of an HTML-shaped attribute
  "resource_value", // value inside a localization resource file (strings.xml, .strings, .stringsdict, .xcstrings)
  "other", // any other string position — the LLM reads source_context for nuance
]);
export type DittoScanDetectionKind = z.infer<
  typeof DittoScanDetectionKindSchema
>;

// Produced by per-language extractors, consumed by `shouldEmit` and the
// rule classifier. The parts the LLM phase sees are surfaced on Candidate as
// `detection_kind` and `context_identifiers`; the optional fields are
// internal-only hints used by the rule classifier.
export interface DittoScanEnclosingContext {
  parentRole: DittoScanDetectionKind;
  // Lowercased identifiers from the wrapping construct, in source order.
  // For `markup_attr` this is the attribute name; otherwise empty.
  identifiers: string[];
  // Top-level identifier of the enclosing call expression, when the receiver
  // is a bare identifier. Examples: `console` for `console.log(...)`, `Log`
  // for `Log.d(...)`, `print` for `print(...)`. Unset when the receiver is
  // not a bare identifier (e.g. `this.log.warn(...)`, `Logger().info(...)`).
  callee?: string;
  // Method side of a member-expression call. `log` for `console.log`, `d`
  // for `Log.d`. Unset for bare-identifier calls like `print(...)`.
  calleeMember?: string;
  // Final method name on the enclosing call, regardless of receiver
  // shape. Set for chained calls where `calleeMember` would not be:
  // `AlertDialog.Builder(ctx).setTitle("X")` -> `setTitle`,
  // `someLabel.setText("X")` -> `setText`. Distinct from `calleeMember`
  // so reject rules (which want certainty about the receiver) can keep
  // using `callee`/`calleeMember` while accept rules can match the
  // method name on broader call shapes.
  methodName?: string;
  // Lowercased tag name of the JSX/Vue element wrapping a `markup_text`
  // candidate. Used by the rule classifier to apply the parent-tag denylist
  // (`<code>`, `<pre>`, etc.).
  parentTag?: string;
}

// One occurrence of the candidate string somewhere else in the codebase. Used
// when the literal is declared as a constant and referenced from elsewhere, so
// the LLM can see how it's actually used. Not populated by the current extract
// pass; reserved for a future constant-reference resolver.
export const DittoScanUsageEvidenceSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  excerpt: z.string(),
});
export type DittoScanUsageEvidence = z.infer<
  typeof DittoScanUsageEvidenceSchema
>;

// A single string literal found in the source, with some context to help the
// LLM decide whether it's user-facing.
export const DittoScanCandidateSchema = z.object({
  id: z.string(),
  value_raw: z.string(),
  detection_kind: DittoScanDetectionKindSchema,
  location: z.object({
    file: z.string(),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
  }),
  language: z.string(),
  // Locale key derived from the file's path when the candidate comes from a
  // per-locale i18n resource file admitted by i18n file discovery (e.g. "en"
  // for locales/en/common.json, "de-DE" for messages.de-DE.json). Null for
  // source-code candidates and i18n files with no locale token in their path.
  locale_key: z.string().nullable(),
  // The string's lookup key within its localization resource file, as
  // written in the file: the dot-joined key path for JSON/YAML catalogs
  // ("labels.paste", "item_one"), the property key, the PO msgid, the
  // XLIFF unit id, the resource name for Android/.resx, the catalog key
  // for iOS .strings/.stringsdict/.xcstrings. Null for source-code
  // candidates and resource hits where no key could be recovered.
  i18n_key: z.string().nullable(),
  // Framework signals derived from the input project's package.json
  // (e.g., ["react", "next"] or ["vue"]). Same for every candidate in a run.
  framework: z.array(z.string()),
  // N surrounding lines with `line: ` prefixes.
  source_context: z.string(),
  context_identifiers: z.array(z.string()),
  usage_evidence: z.array(DittoScanUsageEvidenceSchema).nullable().optional(),
});
export type DittoScanCandidate = z.infer<typeof DittoScanCandidateSchema>;
