import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZIOSStringsDictOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("ios-stringsdict"),
  }).shape
);
