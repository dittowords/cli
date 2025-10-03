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

/**
 * Contains metadata attached to CLI commands via -m or --meta flag
 */
export type CommandMetaFlags = Record<string, string>;
