import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

export const ZI18NextOutput = ZBaseOutputFilters.extend({
  format: z.literal("i18next"),
  generateDriverFile: z.boolean().default(true),
});
