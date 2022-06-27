import fs from "fs";
import yaml, { YAMLException } from "js-yaml";

import { PROJECT_CONFIG_FILE } from "../consts";

interface ConfigProject {
  name: string;
  id: string;
}
interface ConfigYAML {
  components?: boolean;
  projects?: ConfigProject[];
  format?: string;
  variants?: boolean;
}

function jsonIsConfigYAML(json: unknown): json is ConfigYAML {
  return typeof json === "object";
}

function yamlToJson(_yaml: string): ConfigYAML | null {
  try {
    let configYaml = yaml.load(_yaml);
    if (!jsonIsConfigYAML(configYaml)) {
      throw "Yaml is misconfigured";
    }
    return configYaml;
  } catch (e) {
    if (e instanceof YAMLException) {
      return null;
    } else {
      throw e;
    }
  }
}

/**
 * Returns an array containing all valid projects ({ id, name })
 * currently contained in the project config file.
 */
export const getSelectedProjects = (
  configFile = PROJECT_CONFIG_FILE
): { name: string; id: string }[] => {
  if (!fs.existsSync(configFile)) return [];

  const contentYaml = fs.readFileSync(configFile, "utf8");
  const contentJson = yamlToJson(contentYaml);

  if (!(contentJson && contentJson.projects)) {
    return [];
  }

  return contentJson.projects.filter(({ name, id }) => name && id);
};

/**
 * Returns an array containing all valid projects ({ id, name })
 * currently contained in the project config file.
 */
export const getIsUsingComponents = (configFile = PROJECT_CONFIG_FILE) => {
  if (!fs.existsSync(configFile)) return [];

  const contentYaml = fs.readFileSync(configFile, "utf8");
  const contentJson = yamlToJson(contentYaml);

  return contentJson && contentJson.components;
};
