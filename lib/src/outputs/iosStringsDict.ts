import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZIOSStringsDictOutput = ZBaseOutputFilters.extend({
  format: z.literal("ios-stringsdict"),
  framework: z.undefined(),
}).strict();
