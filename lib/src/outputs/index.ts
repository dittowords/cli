import { ProjectConfigYAML } from "../services/projectConfig";
import { z } from "zod";
import { ZI18NextOutput } from "./i18next";

/**
 * The output config is a discriminated union of all the possible output formats.
 */
export const ZOutput = z.discriminatedUnion("format", [ZI18NextOutput]);

export type Output = z.infer<typeof ZOutput>;
