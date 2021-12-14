const fs = require("fs");
const path = require("path");
const url = require("url");
const yaml = require("js-yaml");

const consts = require("./consts");

function createFileIfMissing(filename) {
  const dir = path.dirname(filename);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  if (!fs.existsSync(filename)) {
    fs.closeSync(fs.openSync(filename, "w"));
  }
}

/**
 * Read data from a file
 * @param {*} file defaults to `PROJECT_CONFIG_FILE` defined in `constants.js`
 * @param {*} defaultData defaults to `{}`
 * @returns
 */
function readData(file = consts.PROJECT_CONFIG_FILE, defaultData = {}) {
  createFileIfMissing(file);
  const fileContents = fs.readFileSync(file, "utf8");
  return yaml.safeLoad(fileContents) || defaultData;
}

function writeData(file, data) {
  createFileIfMissing(file);
  const existingData = readData(file);
  const yamlStr = yaml.safeDump({ ...existingData, ...data });
  fs.writeFileSync(file, yamlStr, "utf8");
}

function justTheHost(host) {
  if (!host.includes("://")) return host;
  return url.parse(host).hostname;
}

function deleteToken(file, host) {
  const data = readData(file);
  const hostParsed = justTheHost(host);
  data[hostParsed] = [];
  data[hostParsed][0] = {};
  data[hostParsed][0].token = "";
  writeData(file, data);
}

function saveToken(file, host, token) {
  const data = readData(file);
  const hostParsed = justTheHost(host);
  data[hostParsed] = []; // only allow one token per host
  data[hostParsed][0] = {};
  data[hostParsed][0].token = token;
  writeData(file, data);
}

function getToken(file, host) {
  const data = readData(file);
  const hostEntry = data[justTheHost(host)];
  if (!hostEntry) return undefined;
  const { length } = hostEntry;
  return hostEntry[length - 1].token;
}

function save(file, key, value) {
  const data = readData(file);
  let current = data;
  const parts = key.split(".");
  parts.slice(0, -1).forEach((part) => {
    if (!(part in current)) {
      current[part] = {};
      current = current[part];
    }
  });
  current[parts.slice(-1)] = value;
  writeData(file, data);
}

/**
 * Reads from the config file, filters out
 * invalid projects, determines whether or not
 * the required data is present, and returns:
 * {
 *   hasRequiredData: boolean;
 *   validProjects: Project[];
 *   shouldFetchComponentLibrary: boolean;
 * }
 */
function parseSourceInformation() {
  const { projects, components } = readData();

  const validProjects = [];
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

    validProjects.push(project);
  });

  const shouldFetchComponentLibrary =
    !!components || componentLibraryInProjects;

  const hasRequiredData = validProjects.length || shouldFetchComponentLibrary;

  return {
    hasRequiredData,
    validProjects,
    shouldFetchComponentLibrary,
  };
}

module.exports = {
  createFileIfMissing,
  readData,
  writeData,
  justTheHost,
  saveToken,
  deleteToken,
  getToken,
  save,
  parseSourceInformation,
};
