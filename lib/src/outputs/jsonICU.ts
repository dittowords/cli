import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZJSONICUOutput = ZBaseOutputFilters.extend({
  format: z.literal("json_icu"),
  framework: z.undefined(),
}).strict();
