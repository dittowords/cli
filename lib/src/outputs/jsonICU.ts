import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZJSONICUOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("json_icu"),
    framework: z.undefined().optional(),
  }).shape
);
