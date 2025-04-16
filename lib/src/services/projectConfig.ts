import { z } from "zod";
import fs from "fs";
import { createFileIfMissingSync } from "../utils/fileSystem";
import appContext from "../utils/appContext";
import yaml from "js-yaml";
import { ZBaseOutputFilters } from "../outputs/shared";
import { ZOutput } from "../outputs";
import { YAML_PARSE_ERROR, YAML_LOAD_ERROR } from "../utils/errors";

const ZProjectConfigYAML = ZBaseOutputFilters.extend({
  outputs: z.array(ZOutput),
}).strict();

export type ProjectConfigYAML = z.infer<typeof ZProjectConfigYAML>;

export const DEFAULT_PROJECT_CONFIG_JSON: ProjectConfigYAML = {
  projects: [],
  variants: [],
  outputs: [
    {
      format: "json",
      framework: "i18next",
    },
  ],
};

export async function initProjectConfig(options: { config?: string }) {
  const projectConfig = readProjectConfigData(options.config);
  appContext.setProjectConfig(projectConfig);
}

/**
 * Read data from a global config file
 * @param file defaults to the projectConfigFile defined in appContext
 * @param defaultData defaults to `{}`
 * @returns
 */
function readProjectConfigData(
  file = appContext.projectConfigFile,
  defaultData: ProjectConfigYAML = DEFAULT_PROJECT_CONFIG_JSON
): ProjectConfigYAML {
  let yamlData: unknown = defaultData;

  try {
    createFileIfMissingSync(file, yaml.dump(defaultData));
    const fileContents = fs.readFileSync(file, "utf8");
    yamlData = yaml.load(fileContents);
  } catch (err) {
    throw new Error(YAML_LOAD_ERROR);
  }

  const parsedYAML = ZProjectConfigYAML.safeParse(yamlData);
  if (!parsedYAML.success) {
    throw new Error(YAML_PARSE_ERROR, { cause: parsedYAML.error.issues });
  }
  return parsedYAML.data;
}
