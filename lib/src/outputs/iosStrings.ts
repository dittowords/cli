import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZIOSStringsOutput = ZBaseOutputFilters.extend({
  format: z.literal("ios-strings"),
  framework: z.undefined(),
}).strict();
