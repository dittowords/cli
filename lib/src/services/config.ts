import path from "path";
import appContext from "../utils/appContext";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";

/**
 * Creates a file with t
 * @param filename
 * @param defaultContents
 */
function createFileIfMissing(filename: string, defaultContents?: any) {
  const dir = path.dirname(filename);

  // create the directory if it doesn't already exist
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // create the file if it doesn't already exist
  if (!fs.existsSync(filename)) {
    // create the file, writing the `defaultContents` if provided
    fs.writeFileSync(filename, defaultContents || "", "utf-8");
  }
}

const ZGlobalConfigYAML = z.record(
  z.string(),
  z.array(
    z.object({
      token: z.string(),
    })
  )
);

type GlobalConfigYAML = z.infer<typeof ZGlobalConfigYAML>;

const ZProjectConfigYAML = z.object({
  projects: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
  outputs: z.array(
    z.object({
      format: z.enum(["i18next"]),
    })
  ),
});

type ProjectConfigYAML = z.infer<typeof ZProjectConfigYAML>;

export const DEFAULT_PROJECT_CONFIG_JSON: ProjectConfigYAML = {
  projects: [],
  variants: [],
  outputs: [
    {
      format: "i18next",
    },
  ],
};

/**
 * Read data from a global config file
 * @param {string} file defaults to `CONFIG_FILE` defined in `constants.js`
 * @param {*} defaultData defaults to `{}`
 * @returns { GlobalConfigYAML }
 */
export function readGlobalConfigData(
  file = appContext.configFile,
  defaultData = {}
): GlobalConfigYAML {
  createFileIfMissing(file);
  const fileContents = fs.readFileSync(file, "utf8");
  const yamlData = yaml.load(fileContents);
  const parsedYAML = ZGlobalConfigYAML.safeParse(yamlData);
  if (parsedYAML.success) {
    return parsedYAML.data;
  }
  return defaultData;
}

function writeGlobalConfigData(file: string, data: object) {
  createFileIfMissing(file);
  const existingData = readGlobalConfigData(file);
  const yamlStr = yaml.dump({ ...existingData, ...data });
  fs.writeFileSync(file, yamlStr, "utf8");
}

export function saveToken(file: string, hostname: string, token: string) {
  const data = readGlobalConfigData(file);
  data[hostname] = []; // only allow one token per host
  data[hostname][0] = { token };
  writeGlobalConfigData(file, data);
}
