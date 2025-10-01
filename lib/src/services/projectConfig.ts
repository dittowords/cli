import { z } from "zod";
import fs from "fs";
import { createFileIfMissingSync } from "../utils/fileSystem";
import appContext from "../utils/appContext";
import yaml from "js-yaml";
import { ZBaseOutputFilters } from "../outputs/shared";
import { ZOutput } from "../outputs";
import DittoError, { ErrorType } from "../utils/DittoError";

const ZProjectConfigYAML = ZBaseOutputFilters.extend({
  outputs: z.array(ZOutput),
}).strict();

export type ProjectConfigYAML = z.infer<typeof ZProjectConfigYAML>;

export const DEFAULT_PROJECT_CONFIG_JSON: ProjectConfigYAML = {
  projects: [],
  variants: [],
  components: {
    folders: [],
  },
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
    throw new DittoError({
      type: ErrorType.ConfigYamlLoadError,
      data: { rawErrorMessage: (err as any).message },
      message:
        "Could not load the project config file. Please check the file path and that it is a valid YAML file.",
    });
  }

  const parsedYAML = ZProjectConfigYAML.safeParse(yamlData);
  if (!parsedYAML.success) {
    throw new DittoError({
      type: ErrorType.ConfigParseError,
      data: {
        formattedError: JSON.stringify(parsedYAML.error.flatten(), null, 2),
        messagePrefix: "There is an error in your project config file.",
      },
    });
  }
  return parsedYAML.data;
}
