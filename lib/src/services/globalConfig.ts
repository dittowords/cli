import appContext from "../utils/appContext";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";
import { createFileIfMissingSync } from "../utils/fileSystem";
import { OAuthCredential } from "./oauth/types";

// `token` stays optional so an entry written by the browser login parses, and
// files written by older versions — which always have one — still do too.
const ZGlobalConfigYAML = z.record(
  z.string(),
  z.array(
    z.object({
      token: z.string().optional(),
      oauth: z
        .object({
          accessToken: z.string(),
          refreshToken: z.string().optional(),
          expiresAt: z.number(),
        })
        .optional(),
    })
  )
);

type GlobalConfigYAML = z.infer<typeof ZGlobalConfigYAML>;

/**
 * Read data from a global config file
 * @param file The path to the global config file
 * @returns
 */
export function readGlobalConfigData(
  file = appContext.configFile
): GlobalConfigYAML {
  createFileIfMissingSync(file);
  const fileContents = fs.readFileSync(file, "utf8");
  const yamlData = yaml.load(fileContents);
  const parsedYAML = ZGlobalConfigYAML.safeParse(yamlData);
  if (parsedYAML.success) {
    return parsedYAML.data;
  }
  return {};
}

/**
 * Write data to a global config file
 * @param file The path to the global config file
 * @param data The data to write to the file
 */
function writeGlobalConfigData(file: string, data: object) {
  createFileIfMissingSync(file);
  const existingData = readGlobalConfigData(file);
  const yamlStr = yaml.dump({ ...existingData, ...data });
  fs.writeFileSync(file, yamlStr, "utf8");
}

/**
 * Save a token to the global config file
 * @param file The path to the global config file
 * @param hostname The hostname to save the token for
 * @param token The token to save
 */
export function saveToken(file: string, hostname: string, token: string) {
  const data = readGlobalConfigData(file);
  data[hostname] = [{ token }]; // only allow one token per host
  writeGlobalConfigData(file, data);
}

/**
 * Save OAuth credentials to the global config file
 * @param file The path to the global config file
 * @param hostname The hostname to save the credentials for
 * @param oauth The credentials to save
 */
export function saveOAuthCredential(
  file: string,
  hostname: string,
  oauth: OAuthCredential
) {
  const data = readGlobalConfigData(file);
  // Replaces rather than merges: one credential per host, and a fresh browser
  // login shouldn't leave a stale API key behind to be picked up first.
  data[hostname] = [{ oauth }];
  writeGlobalConfigData(file, data);
}
