import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

const ZBaseJSONOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("json"),
    framework: z.undefined().optional(),
  }).shape
);

const Zi18NextJSONOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("json"),
    framework: z.literal("i18next"),
    type: z.literal("module").or(z.literal("commonjs")).optional(),
  }).shape
);

const ZVueI18nJSONOutput = z.strictObject(
  ZBaseOutputFilters.extend({
    format: z.literal("json"),
    framework: z.literal("vue-i18n"),
    type: z.literal("module").or(z.literal("commonjs")).optional(),
  }).shape
);

export const ZJSONOutput = z.discriminatedUnion("framework", [
  ZBaseJSONOutput,
  Zi18NextJSONOutput,
  ZVueI18nJSONOutput,
]);
