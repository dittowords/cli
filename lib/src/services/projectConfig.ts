import { z } from "zod";
import fs from "fs";
import { createFileIfMissingSync } from "../utils/fileSystem";
import appContext from "../utils/appContext";
import yaml from "js-yaml";
import { ZBaseOutputFilters } from "../outputs/shared";
import { ZOutput } from "../outputs";

const ZProjectConfigYAML = ZBaseOutputFilters.extend({
  outputs: z.array(ZOutput),
}).strict();

export type ProjectConfigYAML = z.infer<typeof ZProjectConfigYAML>;

export const DEFAULT_PROJECT_CONFIG_JSON: ProjectConfigYAML = {
  projects: [],
  variants: [],
  outputs: [
    {
      format: "i18next",
    },
  ],
};

export async function initProjectConfig() {
  const projectConfig = readProjectConfigData();
  appContext.setProjectConfig(projectConfig);
}

/**
 * Read data from a global config file
 * @param file defaults to `CONFIG_FILE` defined in `constants.js`
 * @param defaultData defaults to `{}`
 * @returns
 */
function readProjectConfigData(
  file = appContext.projectConfigFile,
  defaultData: ProjectConfigYAML = DEFAULT_PROJECT_CONFIG_JSON
): ProjectConfigYAML {
  createFileIfMissingSync(file, yaml.dump(defaultData));
  const fileContents = fs.readFileSync(file, "utf8");
  const yamlData = yaml.load(fileContents);
  const parsedYAML = ZProjectConfigYAML.safeParse(yamlData);
  if (!parsedYAML.success) {
    throw new Error("Failed to parse project config file");
  }
  return parsedYAML.data;
}
