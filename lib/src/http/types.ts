import { z } from "zod";

export interface PullFilters {
  projects?: { id: string }[] | false;
  folders?: {
    id: string;
    excludeNestedFolders?: boolean;
  }[];
  variants?: { id: string }[];
}

export interface SwiftFileGenerationFilters
  extends Omit<PullFilters, "variants"> {
  localeByVariantId: Record<string, string>;
}

export interface PullQueryParams {
  filter: string; // Stringified PullFilters
  richText?: "html";
  format?: "ios-strings" | "ios-stringsdict" | "android" | "icu" | undefined;
}

const ZBaseTextEntity = z.object({
  id: z.string(),
  text: z.string(),
  richText: z.string().optional(),
  status: z.string(),
  notes: z.string(),
  tags: z.array(z.string()),
  variableIds: z.array(z.string()),
  variantId: z.string().nullable(),
});

const ZTextItem = ZBaseTextEntity.extend({
  projectId: z.string(),
});

export const TEXT_ITEM_STATUSES = ["NONE", "WIP", "REVIEW", "FINAL"] as const;
export const ZTextItemStatus = z.enum(TEXT_ITEM_STATUSES);

export function isTextItem(item: TextItem | Component): item is TextItem {
  return "projectId" in item;
}

/**
 * Represents a single text item, as returned from the /v2/textItems endpoint
 */
export type TextItem = z.infer<typeof ZTextItem>;

export const ZTextItemsResponse = z.array(ZTextItem);
export type TextItemsResponse = z.infer<typeof ZTextItemsResponse>;

const ZExportTextItemsStringResponse = z.string();
export type ExportTextItemsStringResponse = z.infer<
  typeof ZExportTextItemsStringResponse
>;

const ZExportTextItemsJSONResponse = z.record(z.string(), z.string());
export type ExportTextItemsJSONResponse = z.infer<
  typeof ZExportTextItemsJSONResponse
>;

export const ZExportTextItemsResponse = z.union([
  ZExportTextItemsStringResponse,
  ZExportTextItemsJSONResponse,
]);
export type ExportTextItemsResponse = z.infer<typeof ZExportTextItemsResponse>;

// MARK - Components

const ZComponent = ZBaseTextEntity.extend({
  folderId: z.string().nullable(),
});

/**
 * Represents a single component, as returned from the /v2/components endpoint
 */
export type Component = z.infer<typeof ZComponent>;

export const ZComponentsResponse = z.array(ZComponent);
export type ComponentsResponse = z.infer<typeof ZComponentsResponse>;

export const ZExportComponentsJSONResponse = z.record(z.string(), z.string());
export type ExportComponentsJSONResponse = z.infer<
  typeof ZExportTextItemsJSONResponse
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
  statuses: z.array(ZTextItemStatus).optional(),
});

export type IExportSwiftFileRequest = z.infer<typeof ZExportSwiftFileRequest>;
