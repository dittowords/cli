import fs from "fs";
import path from "path";
import url from "url";
import yaml from "js-yaml";
import * as Sentry from "@sentry/node";

import consts from "./consts";
import { Project, ConfigYAML } from "./types";
import { createSentryContext } from "./utils/createSentryContext";

export const DEFAULT_CONFIG_JSON: ConfigYAML = {
  sources: {
    components: { enabled: true },
  },
  variants: true,
  format: "flat",
};

export const DEFAULT_CONFIG = yaml.dump(DEFAULT_CONFIG_JSON);

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

function jsonIsConfigYAML(json: unknown): json is ConfigYAML {
  return typeof json === "object";
}

function jsonIsGlobalYAML(
  json: unknown
): json is Record<string, { token: string }[]> {
  return (
    !!json &&
    typeof json === "object" &&
    Object.values(json).every(
      (arr) =>
        (arr as any).every &&
        arr.every(
          (val: any) =>
            typeof val === "object" && Object.keys(val).includes("token")
        )
    )
  );
}

/**
 * Read data from a project config file
 * @param {string} file defaults to `PROJECT_CONFIG_FILE` defined in `constants.js`
 * @param {*} defaultData defaults to `{}`
 * @returns { ConfigYAML }
 */
function readProjectConfigData(
  file = consts.PROJECT_CONFIG_FILE,
  defaultData = {}
): ConfigYAML {
  createFileIfMissing(file, DEFAULT_CONFIG);
  const fileContents = fs.readFileSync(file, "utf8");
  const yamlData = yaml.load(fileContents);
  if (jsonIsConfigYAML(yamlData)) {
    return yamlData;
  }
  return defaultData;
}

/**
 * Read data from a global config file
 * @param {string} file defaults to `CONFIG_FILE` defined in `constants.js`
 * @param {*} defaultData defaults to `{}`
 * @returns { Record<string, { token: string }[]> }
 */
function readGlobalConfigData(
  file = consts.CONFIG_FILE,
  defaultData = {}
): Record<string, { token: string }[]> {
  createFileIfMissing(file);
  const fileContents = fs.readFileSync(file, "utf8");
  const yamlData = yaml.load(fileContents);
  if (jsonIsGlobalYAML(yamlData)) {
    return yamlData;
  }
  return defaultData;
}

function writeProjectConfigData(file: string, data: Partial<ConfigYAML>) {
  createFileIfMissing(file, DEFAULT_CONFIG);
  const existingData = readProjectConfigData(file);

  const configData: ConfigYAML = {
    ...existingData,
    ...data,
    sources: {
      ...existingData.sources,
      ...data.sources,
    },
  };

  const yamlStr = yaml.dump(configData);
  fs.writeFileSync(file, yamlStr, "utf8");
}

function writeGlobalConfigData(file: string, data: object) {
  createFileIfMissing(file);
  const existingData = readGlobalConfigData(file);
  const yamlStr = yaml.dump({ ...existingData, ...data });
  fs.writeFileSync(file, yamlStr, "utf8");
}

function justTheHost(host: string) {
  if (!host.includes("://")) return host;
  return url.parse(host).hostname || "";
}

function deleteToken(file: string, host: string) {
  const data = readGlobalConfigData(file);
  const hostParsed = justTheHost(host);
  data[hostParsed] = [];
  data[hostParsed][0] = { token: "" };
  writeGlobalConfigData(file, data);
}

function saveToken(file: string, host: string, token: string) {
  const data = readGlobalConfigData(file);
  const hostParsed = justTheHost(host);
  data[hostParsed] = []; // only allow one token per host
  data[hostParsed][0] = { token };
  writeGlobalConfigData(file, data);
}

function getTokenFromEnv() {
  return process.env.DITTO_API_KEY;
}

/**
 *
 * @param {string} file
 * @param {string} host
 * @returns {Token}
 */
function getToken(file: string, host: string) {
  const tokenFromEnv = getTokenFromEnv();
  if (tokenFromEnv) {
    return tokenFromEnv;
  }

  const data = readGlobalConfigData(file);
  const hostEntry = data[justTheHost(host)];
  if (!hostEntry) return undefined;
  const { length } = hostEntry;

  return hostEntry[length - 1].token;
}

const IS_DUPLICATE = /-(\d+$)/;

function dedupeProjectName(projectNames: Set<string>, projectName: string) {
  let dedupedName = projectName;

  if (projectNames.has(dedupedName)) {
    while (projectNames.has(dedupedName)) {
      const [_, numberStr] = dedupedName.match(IS_DUPLICATE) || [];
      if (numberStr && !isNaN(parseInt(numberStr))) {
        dedupedName = `${dedupedName.replace(IS_DUPLICATE, "")}-${
          parseInt(numberStr) + 1
        }`;
      } else {
        dedupedName = `${dedupedName}-1`;
      }
    }
  }

  return dedupedName;
}

/**
 * Reads from the config file, filters out
 * invalid projects, dedupes those remaining, and returns:
 * - whether or not the data required to `pull` is present
 * - whether or not the component library should be fetched
 * - an array of valid, deduped projects
 * - the `variants` and `format` config options
 */
function parseSourceInformation(file?: string) {
  const {
    sources,
    variants,
    format,
    status,
    richText,
    projects: projectsRoot,
    components: componentsRoot,
  } = readProjectConfigData(file);

  const projects = sources?.projects || [];

  const projectNames = new Set<string>();
  const validProjects: Project[] = [];
  let hasComponentLibraryInProjects = false;

  (projects || []).forEach((project) => {
    const isValid = project.id && project.name;
    if (!isValid) {
      return;
    }

    if (project.id === "ditto_component_library") {
      hasComponentLibraryInProjects = true;
      return;
    }

    project.fileName = dedupeProjectName(projectNames, project.name);
    projectNames.add(project.fileName);

    validProjects.push(project);
  });

  const shouldFetchComponentLibrary = Boolean(sources?.components?.enabled);

  const hasSourceData = !!validProjects.length || shouldFetchComponentLibrary;

  const result = {
    hasSourceData,
    validProjects,
    shouldFetchComponentLibrary,
    variants: variants || false,
    format,
    status,
    richText,
    hasTopLevelProjectsField: !!projectsRoot,
    hasTopLevelComponentsField: !!componentsRoot,
    hasComponentLibraryInProjects,
    componentFolders: sources?.components?.folders || null,
  };

  Sentry.setContext("config", createSentryContext(result));

  return result;
}

export default {
  createFileIfMissing,
  readProjectConfigData,
  readGlobalConfigData,
  writeGlobalConfigData,
  writeProjectConfigData,
  justTheHost,
  saveToken,
  deleteToken,
  getToken,
  getTokenFromEnv,
  parseSourceInformation,
};
