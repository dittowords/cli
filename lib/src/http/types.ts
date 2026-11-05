import { z } from "zod";

export interface PullFilters {
  projects?: { id: string }[] | false;
  bases?: { id: string }[];
  folders?: {
    id: string;
    excludeNestedFolders?: boolean;
  }[];
  statuses?: ITextStatus[];
  integrated?: boolean;
  tags?: ITagsFilter;
}
export interface PullQueryParams {
  filter: string; // Stringified PullFilters
  richText?: RichTextOutputOption;
  variantId?: string; // undefined for base
  format?: ExportFormat | undefined;
  /**
   * Omits the `__variant-name` / `__variant-description` keys the API adds to variant exports
   * in the JSON formats. Stringified because it travels as a query param.
   */
  excludeVariantMetadata?: "true";
  /**
   * Adds a `__variables_used` key listing the variable names referenced by the exported
   * strings. Only has an effect on `json_i18next` and `json_vue_i18n`.
   */
  includeVariableSummary?: "true";
}

/**
 * How the API should render rich text. Mirrors RICH_TEXT_OUTPUT_OPTIONS in the API.
 * - `html` strips wrapping `<p>` tags and preserves line breaks as `<br />`
 * - `html_paragraphs` wraps all text in `<p>` tags (legacy behavior)
 */
export const RICH_TEXT_OUTPUT_OPTIONS = ["html", "html_paragraphs"] as const;
export type RichTextOutputOption = (typeof RICH_TEXT_OUTPUT_OPTIONS)[number];

/**
 * The `format` values accepted by /v2/textItems/export and /v2/components/export.
 * Mirrors EXPORT_FORMATS in the API.
 */
export const EXPORT_FORMATS = [
  "json_icu",
  "json_i18next",
  "json_vue_i18n",
  "ios-strings",
  "ios-stringsdict",
  "android",
  "arb",
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Key the API adds to i18next/vue-i18n exports when `includeVariableSummary` is 'true'. */
export const VARIABLES_USED_KEY = "__variables_used";

export const ZTextStatus = z.enum(["NONE", "WIP", "REVIEW", "FINAL"]);
export type ITextStatus = z.infer<typeof ZTextStatus>;

export const ZTagsFilter = z.object({
  values: z.array(z.string()),
  operator: z.enum(["AND", "OR"]).optional(),
});
export type ITagsFilter = z.infer<typeof ZTagsFilter>;

const ZExportTextItemsStringResponse = z.string();
export type ExportTextItemsStringResponse = z.infer<
  typeof ZExportTextItemsStringResponse
>;

// Most JSON export formats (e.g. json_icu) map each key to a plain string, but some
// (e.g. arb) also include metadata entries (e.g. "@key") whose value is an object, and
// json_i18next / json_vue_i18n add a `__variables_used` string array when requested.
const ZExportItemValue = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.unknown()),
]);

const ZExportTextItemsJSONResponse = z.record(z.string(), ZExportItemValue);
export type ExportTextItemsJSONResponse = z.infer<
  typeof ZExportTextItemsJSONResponse
>;

export const ZExportTextItemsResponse = z.union([
  ZExportTextItemsStringResponse,
  ZExportTextItemsJSONResponse,
]);
export type ExportTextItemsResponse = z.infer<typeof ZExportTextItemsResponse>;

// MARK - Components

export const ZExportComponentsJSONResponse = z.record(
  z.string(),
  ZExportItemValue
);
export type ExportComponentsJSONResponse = z.infer<
  typeof ZExportComponentsJSONResponse
>;

export const ZExportComponentsStringResponse = z.string();
export type ExportComponentsStringResponse = z.infer<
  typeof ZExportComponentsStringResponse
>;
export const ZExportComponentsResponse = z.union([
  ZExportComponentsStringResponse,
  ZExportComponentsJSONResponse,
]);
export type ExportComponentsResponse = z.infer<
  typeof ZExportComponentsResponse
>;

// MARK - Projects

const ZProject = z.object({
  id: z.string(),
  name: z.string(),
  baseId: z.string().nullable(),
});

/**
 * Represents a single project, as returned from the /v2/projects endpoint
 */
export type Project = z.infer<typeof ZProject>;

export const ZProjectsResponse = z.array(ZProject);
export type ProjectsResponse = z.infer<typeof ZProjectsResponse>;

// MARK - Variants

const ZVariant = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

/**
 * Represents a single variant, as returned from the /v2/variants endpoint
 */
export type Variant = z.infer<typeof ZVariant>;

export const ZVariantsResponse = z.array(ZVariant);
export type VariantsResponse = z.infer<typeof ZVariantsResponse>;

/**
 * Contains metadata attached to CLI commands via -m or --meta flag
 * Currently only used internally to identify requests from our GitHub Action
 */
export type CommandMetaFlags = {
  githubActionRequest?: string; // Set to "true" if the request is from our GitHub Action
  [key: string]: string | undefined; // Allow other arbitrary key-value pairs, but none of these values are used for anything at the moment
};

// MARK - IOS

const ZFolderParam = z.object({
  id: z.string(),
  excludeNestedFolders: z.boolean().optional(),
});

export const ZExportSwiftFileRequest = z.object({
  projects: z.array(z.object({ id: z.string() })).optional(),
  components: z
    .object({
      folders: z.array(ZFolderParam).optional(),
    })
    .optional(),
  statuses: z.array(ZTextStatus).optional(),
  integrated: z.boolean().optional(),
  tags: ZTagsFilter.optional(),
});

export type IExportSwiftFileRequest = z.infer<typeof ZExportSwiftFileRequest>;

export const ZInitiateScanBodySchema = z.object({
  path: z.string(),
  renamesSinceLastScan: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .optional(),
  repoKey: z.string().optional(),
  gitCommitSha: z.string().optional(),
  gitBranch: z.string().nullable().optional(),
  scannedAllPaths: z.boolean().optional(),
  scannedPaths: z.array(z.string()).optional(),
  repoRelativeRoot: z.string().optional(),
});
export type IInitiateScanBody = z.infer<typeof ZInitiateScanBodySchema>;
export const ZInitiateScanResponse = z.object({
  record: z.object({ _id: z.string() }),
  candidatesSignedS3Url: z.string(),
  // Null when there is no limit.
  planLimit: z
    .object({
      plan: z.string(),
      candidateLimit: z.number(),
      candidatesUsed: z.number(),
    })
    .nullish(),
});
export type IInitiateScanResponse = z.infer<typeof ZInitiateScanResponse>;

export const ZGetLastScannedCommitResponse = z.object({
  lastScannedCommit: z.string().nullish(),
});
