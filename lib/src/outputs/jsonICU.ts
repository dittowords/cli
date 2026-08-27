import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

/**
 * @deprecated Use { format: "json", framework: "icu" } instead (see ZICUJSONOutput in ./json.ts).
 * Kept for backwards compatibility; formatOutput logs a warning when this format is used.
 */
export const ZJSONICUOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("json_icu"),
  }).shape
);
