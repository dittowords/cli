import { z } from "zod";
import { ZJSONOutput } from "./json";
import { ZIOSStringsOutput } from "./iosStrings";
import { ZIOSStringsDictOutput } from "./iosStringsDict";

/**
 * The output config is a discriminated union of all the possible output formats.
 */
export const ZOutput = z.union([
  ...ZJSONOutput.options,
  ZIOSStringsOutput,
  ZIOSStringsDictOutput,
]);

export type Output = z.infer<typeof ZOutput>;
