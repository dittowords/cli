import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZICUOutput = ZBaseOutputFilters.extend({
  format: z.literal("icu"),
  framework: z.undefined(),
}).strict();
