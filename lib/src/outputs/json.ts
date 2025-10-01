import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

const ZBaseJSONOutput = ZBaseOutputFilters.extend({
  format: z.literal("json"),
  framework: z.undefined(),
}).strict();

const Zi18NextJSONOutput = ZBaseJSONOutput.extend({
  framework: z.literal("i18next"),
  type: z.literal("module").or(z.literal("commonjs")).optional(),
}).strict();

const ZVueI18nJSONOutput = ZBaseJSONOutput.extend({
  framework: z.literal("vue-i18n"),
  type: z.literal("module").or(z.literal("commonjs")).optional(),
}).strict();

export const ZJSONOutput = z.discriminatedUnion("framework", [
  ZBaseJSONOutput,
  Zi18NextJSONOutput,
  ZVueI18nJSONOutput,
]);
