import appContext from "../utils/appContext";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";
import { createFileIfMissingSync } from "../utils/fileSystem";
import { OAuthSession } from "./auth/loopbackFlow";

const ZOAuthSession = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
});

/**
 * `token` is optional so pre-OAuth entries still parse — a schema miss falls back
 * to `{}`, signing out everyone who upgrades.
 */
const ZGlobalConfigEntry = z.object({
  token: z.string().optional(),
  oauth: ZOAuthSession.optional(),
});

const ZGlobalConfigYAML = z.record(z.string(), z.array(ZGlobalConfigEntry));

type GlobalConfigYAML = z.infer<typeof ZGlobalConfigYAML>;
export type GlobalConfigEntry = z.infer<typeof ZGlobalConfigEntry>;

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

  // This file holds API keys and refresh tokens, so keep it owner-only. Best-effort:
  // chmod is a partial no-op on Windows, and a config we can't lock down still beats
  // failing the write.
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Ignore.
  }

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

/** Saves a session. One credential per host, so this replaces a stored API key. */
export function saveOAuthSession(
  file: string,
  hostname: string,
  oauth: OAuthSession
) {
  const data = readGlobalConfigData(file);
  // Legacy mode's parser requires a `token` key on every entry, or it reads the
  // whole file as unparseable and its next write drops every host.
  data[hostname] = [{ token: "", oauth }];
  writeGlobalConfigData(file, data);
}

/** The stored credential for a host, or undefined if there isn't one. */
export function readCredential(
  file: string,
  hostname: string
): GlobalConfigEntry | undefined {
  return readGlobalConfigData(file)[hostname]?.[0];
}

/**
 * Forgets a host's credential. Empties the entry rather than removing the key:
 * `writeGlobalConfigData` merges, so it can't express a deletion, and legacy
 * `deleteToken` does the same because its reader indexes the list unguarded.
 */
export function clearCredential(file: string, hostname: string) {
  const data = readGlobalConfigData(file);
  data[hostname] = [{ token: "" }];
  writeGlobalConfigData(file, data);
}
