import { z } from "zod";

/**
 * These filters that are common to all outputs, used to filter the text items that are fetched from the API.
 * They are all optional by defualt unless otherwise specified in the output config.
 */
export const ZBaseOutputFilters = z.object({
  projects: z.array(z.object({ id: z.string() })).optional(),
  variants: z.array(z.object({ id: z.string() })).optional(),
  outDir: z.string().optional(),
  richText: z.literal("html").optional(),
});
