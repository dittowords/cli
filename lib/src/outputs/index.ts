import { z } from "zod";
import { ZJSONOutput } from "./json";

/**
 * The output config is a discriminated union of all the possible output formats.
 */
export const ZOutput = z.union([...ZJSONOutput.options]);

export type Output = z.infer<typeof ZOutput>;
