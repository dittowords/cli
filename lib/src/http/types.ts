import { z } from "zod";

export interface PullFilters {
  projects?: { id: string }[] | false;
  folders?: {
    id: string;
    excludeNestedFolders?: boolean;
  }[];
  variants?: { id: string }[];
}

export interface PullQueryParams {
  filter: string; // Stringified PullFilters
  richText?: "html";
  format?: "ios-strings" | undefined;
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

export function isTextItem(item: TextItem | Component): item is TextItem {
  return "projectId" in item;
}

/**
 * Represents a single text item, as returned from the /v2/textItems endpoint
 */
export type TextItem = z.infer<typeof ZTextItem>;

export const ZTextItemsResponse = z.array(ZTextItem);
export type TextItemsResponse = z.infer<typeof ZTextItemsResponse>;

export const ZExportTextItemsResponse = z.string();
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

/**
 * Contains metadata attached to CLI commands via -m or --meta flag
 * Currently only used internally to identify requests from our GitHub Action
 */
export type CommandMetaFlags = {
  githubActionRequest?: string; // Set to "true" if the request is from our GitHub Action
  [key: string]: string | undefined; // Allow other arbitrary key-value pairs, but none of these values are used for anything at the moment
};
