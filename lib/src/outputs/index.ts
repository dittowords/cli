import { z } from "zod";
import { ZJSONOutput } from "./json";
import { ZIOSStringsOutput } from "./iosStrings";
import { ZIOSStringsDictOutput } from "./iosStringsDict";
import { ZAndroidOutput } from "./android";
import { ZJSONICUOutput } from "./jsonICU";

/**
 * The output config is a discriminated union of all the possible output formats.
 */
export const ZOutput = z.union([
  ...ZJSONOutput.options,
  ZAndroidOutput,
  ZIOSStringsOutput,
  ZIOSStringsDictOutput,
  ZJSONICUOutput,
]);

export type Output = z.infer<typeof ZOutput>;
