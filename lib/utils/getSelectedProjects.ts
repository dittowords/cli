import fs from "fs";
import yaml, { YAMLException } from "js-yaml";

import { PROJECT_CONFIG_FILE } from "../consts";
import { ConfigYAML, Project } from "../types";
import Config, { DEFAULT_CONFIG_JSON } from "../config";

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
export const getSelectedProjects = (configFile = PROJECT_CONFIG_FILE) =>
  Config.parseSourceInformation(configFile).validProjects;

export const getIsUsingComponents = (configFile = PROJECT_CONFIG_FILE) =>
  Config.parseSourceInformation(configFile).shouldFetchComponentLibrary;
