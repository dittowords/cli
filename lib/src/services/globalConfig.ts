import appContext from "../utils/appContext";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";
import { createFileIfMissingSync } from "../utils/fileSystem";

const ZGlobalConfigYAML = z.record(
  z.string(),
  z.array(
    z.object({
      token: z.string(),
    })
  )
);

type GlobalConfigYAML = z.infer<typeof ZGlobalConfigYAML>;

/**
 * Read data from a global config file
 * @param file The path to the global config file
 * @param defaultData The default data to return if the file is not found or invalid
 * @returns
 */
export function readGlobalConfigData(
  file = appContext.configFile,
  defaultData: GlobalConfigYAML = {}
): GlobalConfigYAML {
  createFileIfMissingSync(file);
  const fileContents = fs.readFileSync(file, "utf8");
  const yamlData = yaml.load(fileContents);
  const parsedYAML = ZGlobalConfigYAML.safeParse(yamlData);
  if (parsedYAML.success) {
    return parsedYAML.data;
  }
  return defaultData;
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
