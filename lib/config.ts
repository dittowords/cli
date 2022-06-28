import fs from "fs";
import path from "path";
import url from "url";
import yaml from "js-yaml";

import consts from "./consts";
import { Project, ConfigYAML } from "./types";

function createFileIfMissing(filename: string) {
  const dir = path.dirname(filename);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  if (!fs.existsSync(filename)) {
    fs.closeSync(fs.openSync(filename, "w"));
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
    Object.values(json).every((arr) =>
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
  createFileIfMissing(file);
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

function writeProjectConfigData(file: string, data: object) {
  createFileIfMissing(file);
  const existingData = readProjectConfigData(file);
  const yamlStr = yaml.dump({ ...existingData, ...data });
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
 * @returns {string | undefined}
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
function parseSourceInformation() {
  const { projects, components, variants, format } = readProjectConfigData();

  const projectNames = new Set<string>();
  const validProjects: Project[] = [];

  let componentLibraryInProjects = false;

  (projects || []).forEach((project) => {
    const isValid = project.id && project.name;
    if (!isValid) {
      return;
    }

    if (project.id === "ditto_component_library") {
      componentLibraryInProjects = true;
      return;
    }

    project.fileName = dedupeProjectName(projectNames, project.name);
    projectNames.add(project.fileName);

    validProjects.push(project);
  });

  const shouldFetchComponentLibrary =
    !!components || componentLibraryInProjects;

  const hasSourceData = validProjects.length || shouldFetchComponentLibrary;

  return {
    hasSourceData,
    validProjects,
    shouldFetchComponentLibrary,
    variants,
    format,
  };
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
