import fs from "fs";
import yaml, { YAMLException } from "js-yaml";

import { PROJECT_CONFIG_FILE } from "../consts";
import { ConfigYAML, Project } from "../types";
import { DEFAULT_CONFIG_JSON } from "../config";

function jsonIsConfigYAML(json: unknown): json is ConfigYAML {
  return typeof json === "object";
}

function yamlToJson(_yaml: string): ConfigYAML | null {
  try {
    let configYaml = yaml.load(_yaml);
    if (!jsonIsConfigYAML(configYaml)) {
      return {};
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
): Project[] => {
  if (!fs.existsSync(configFile)) return [];

  const contentYaml = fs.readFileSync(configFile, "utf8");
  const contentJson = yamlToJson(contentYaml);

  if (!contentJson) {
    return [];
  }

  if (contentJson.projects) {
    throw new Error(
      `Support for "projects" as a top-level key has been removed; please use "sources.projects" instead.`
    );
  }

  if (!contentJson.sources?.projects) {
    return [];
  }

  return contentJson.sources.projects.filter(({ name, id }) => name && id);
};

/**
 * Returns a boolean indicating whether or not the component library
 * should be fetched. Defaults to `COMPONENTS_ENABLED_BY_DEFAULT`.
 */
export const getIsUsingComponents = (
  configFile = PROJECT_CONFIG_FILE
): boolean => {
  if (!fs.existsSync(configFile)) return false;

  const contentYaml = fs.readFileSync(configFile, "utf8");
  const contentJson = yamlToJson(contentYaml);

  if (!contentJson) {
    return Boolean(DEFAULT_CONFIG_JSON.sources?.components);
  }

  if (contentJson.components !== undefined) {
    throw new Error(
      `Support for "components" as a top-level key has been removed; please use "sources.components" instead.`
    );
  }

  if (contentJson.sources?.components === undefined) {
    return Boolean(DEFAULT_CONFIG_JSON.sources?.components);
  }

  return Boolean(contentJson.sources.components);
};
