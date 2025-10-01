import { z } from "zod";

/**
 * These filters that are common to all outputs, used to filter the text items and components that are fetched from the API.
 * They are all optional by default unless otherwise specified in the output config.
 */
export const ZBaseOutputFilters = z.object({
  projects: z.array(z.object({ id: z.string() })).optional(),
  components: z.object({ 
    folders: z.array(z.object({ 
      id: z.string(),
      excludeNestedFolders: z.boolean().optional(),
    })).optional(),
  }).optional(),
  variants: z.array(z.object({ id: z.string() })).optional(),
  outDir: z.string().optional(),
  richText: z.union([z.literal("html"), z.literal(false)]).optional(),
});
