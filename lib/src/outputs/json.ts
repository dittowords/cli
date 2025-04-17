import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";

const ZBaseJSONOutput = ZBaseOutputFilters.extend({
  format: z.literal("json"),
  framework: z.undefined(),
});

const Zi18NextJSONOutput = ZBaseJSONOutput.extend({
  framework: z.literal("i18next"),
  type: z.literal("module").or(z.literal("commonjs")).optional(),
});

export const ZJSONOutput = z.discriminatedUnion("framework", [
  ZBaseJSONOutput,
  Zi18NextJSONOutput,
]);
