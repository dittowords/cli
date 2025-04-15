import { z } from "zod";
import { ZBaseOutputFilters } from "./shared";
import { ZJSONFramework } from "./frameworks/json";

const ZBaseJSONOutput = ZBaseOutputFilters.extend({
  format: z.literal("json"),
  framework: z.undefined(),
});

const Zi18NextJSONOutput = ZBaseJSONOutput.extend({
  framework: ZJSONFramework,
});

export const ZJSONOutput = z.discriminatedUnion("framework", [
  ZBaseJSONOutput,
  Zi18NextJSONOutput,
]);
