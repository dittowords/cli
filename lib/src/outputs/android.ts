import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZAndroidOutput = ZBaseOutputFilters.extend({
  format: z.literal("android"),
  framework: z.undefined(),
}).strict();
