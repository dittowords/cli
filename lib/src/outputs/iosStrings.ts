import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZIOSStringsOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("ios-strings"),
    framework: z.undefined().optional(),
  }).shape
);
