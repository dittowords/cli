import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZAndroidOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("android"),
  }).shape
);
