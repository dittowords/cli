"use strict";
const chalk = require("chalk");
const errorText = (msg) => chalk.magenta(msg);
const warnText = (msg) => chalk.yellow(msg);
const info = (msg) => chalk.blueBright(msg);
const success = (msg) => chalk.green(msg);
const url = (msg) => chalk.blueBright.underline(msg);
const subtle = (msg) => chalk.grey(msg);
const write = (msg) => chalk.white(msg);
const nl = () => console.log("\n");
module.exports = {
    errorText,
    warnText,
    url,
    info,
    write,
    subtle,
    nl,
    success,
};
const output = require("../output");
function projectsToText(projects) {
    return ((projects || []).reduce((outputString, { name, id }) => outputString +
        ("\n" +
            "- " +
            output.info(name) +
            " " +
            output.subtle("https://app.dittowords.com/doc/" + id)), "") + "\n");
}
module.exports = projectsToText;
const homedir = require("os").homedir();
const path = require("path");
const TEXT_DIR = process.env.DITTO_TEXT_DIR || "ditto";
module.exports.API_HOST =
    process.env.DITTO_API_HOST || "https://api.dittowords.com";
module.exports.CONFIG_FILE =
    process.env.DITTO_CONFIG_FILE || path.join(homedir, ".config", "ditto");
module.exports.PROJECT_CONFIG_FILE = path.normalize(path.join("ditto", "config.yml"));
module.exports.TEXT_DIR = TEXT_DIR;
module.exports.TEXT_FILE = path.normalize(path.join(TEXT_DIR, "text.json"));
const fs = require("fs");
const path = require("path");
const url = require("url");
const yaml = require("js-yaml");
const consts = require("./consts");
function createFileIfMissing(filename) {
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
    if (!fs.existsSync(filename)) {
        fs.closeSync(fs.openSync(filename, "w"));
    }
}
/**
 * Read data from a file
 * @param {string} file defaults to `PROJECT_CONFIG_FILE` defined in `constants.js`
 * @param {*} defaultData defaults to `{}`
 * @returns
 */
function readData(file = consts.PROJECT_CONFIG_FILE, defaultData = {}) {
    createFileIfMissing(file);
    const fileContents = fs.readFileSync(file, "utf8");
    return yaml.load(fileContents) || defaultData;
}
function writeData(file, data) {
    createFileIfMissing(file);
    const existingData = readData(file);
    const yamlStr = yaml.dump({ ...existingData, ...data });
    fs.writeFileSync(file, yamlStr, "utf8");
}
function justTheHost(host) {
    if (!host.includes("://"))
        return host;
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
function getTokenFromEnv() {
    return process.env.DITTO_API_KEY;
}
function getToken(file, host) {
    const tokenFromEnv = getTokenFromEnv();
    if (tokenFromEnv) {
        return tokenFromEnv;
    }
    const data = readData(file);
    const hostEntry = data[justTheHost(host)];
    if (!hostEntry)
        return undefined;
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
const IS_DUPLICATE = /-(\d+$)/;
function dedupeProjectName(projectNames, projectName) {
    let dedupedName = projectName;
    if (projectNames.has(dedupedName)) {
        while (projectNames.has(dedupedName)) {
            const [_, numberStr] = dedupedName.match(IS_DUPLICATE) || [];
            if (numberStr && !isNaN(parseInt(numberStr))) {
                dedupedName = `${dedupedName.replace(IS_DUPLICATE, "")}-${parseInt(numberStr) + 1}`;
            }
            else {
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
    const { projects, components, variants, format } = readData();
    const projectNames = new Set();
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
        project.fileName = dedupeProjectName(projectNames, project.name);
        projectNames.add(project.fileName);
        validProjects.push(project);
    });
    const shouldFetchComponentLibrary = !!components || componentLibraryInProjects;
    const hasSourceData = validProjects.length || shouldFetchComponentLibrary;
    return {
        hasSourceData,
        validProjects,
        shouldFetchComponentLibrary,
        variants,
        format,
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
    getTokenFromEnv,
    save,
    parseSourceInformation,
};
const axios = require("axios").default;
const config = require("./config");
const consts = require("./consts");
function create(token) {
    return axios.create({
        baseURL: consts.API_HOST,
        headers: {
            Authorization: `token ${token}`,
        },
    });
}
module.exports = { create };
module.exports.default = create(config.getToken(consts.CONFIG_FILE, consts.API_HOST));
const fs = require("fs");
const chalk = require("chalk");
const { prompt } = require("enquirer");
const api = require("../api");
const consts = require("../consts");
const output = require("../output");
const config = require("../config");
function needsToken(configFile, host = consts.API_HOST) {
    if (config.getTokenFromEnv()) {
        return false;
    }
    const file = configFile || consts.CONFIG_FILE;
    if (!fs.existsSync(file))
        return true;
    const configData = config.readData(file);
    if (!configData[config.justTheHost(host)] ||
        configData[config.justTheHost(host)][0].token === "")
        return true;
    return false;
}
// Returns true if valid, otherwise an error message.
async function checkToken(token) {
    const axios = api.create(token);
    const endpoint = "/token-check";
    const resOrError = await axios
        .get(endpoint)
        .catch((error) => {
        if (error.code === "ENOTFOUND") {
            return output.errorText(`Can't connect to API: ${output.url(error.hostname)}`);
        }
        if (error.response.status === 401 || error.response.status === 404) {
            return output.errorText("This API key isn't valid. Please try another.");
        }
        return output.warnText("We're having trouble reaching the Ditto API.");
    })
        .catch(() => output.errorText("Sorry! We're having trouble reaching the Ditto API."));
    if (typeof resOrError === "string")
        return resOrError;
    if (resOrError.status === 200)
        return true;
    return output.errorText("This API key isn't valid. Please try another.");
}
async function collectToken(message) {
    const blue = output.info;
    const apiUrl = output.url("https://app.dittowords.com/account/user");
    const breadcrumbs = `${blue("User")}`;
    const tokenDescription = message ||
        `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} > ${breadcrumbs} under "${chalk.bold("API Keys")}".`;
    console.log(tokenDescription);
    const response = await prompt({
        type: "input",
        name: "token",
        message: "What is your API key?",
        validate: (token) => checkToken(token),
    });
    return response.token;
}
function quit(exitCode = 2) {
    console.log("API key was not saved.");
    process.exitCode = exitCode;
    process.exit();
}
async function collectAndSaveToken(message = null) {
    try {
        const token = await collectToken(message);
        console.log(`Thanks for authenticating.  We'll save the key to: ${output.info(consts.CONFIG_FILE)}`);
        output.nl();
        config.saveToken(consts.CONFIG_FILE, consts.API_HOST, token);
        return token;
    }
    catch (error) {
        quit();
    }
}
module.exports = { needsToken, collectAndSaveToken };
const { AutoComplete } = require("enquirer");
const output = require("../output");
function formatProjectChoice(project) {
    return (project.name +
        " " +
        output.subtle(project.url || `https://app.dittowords.com/doc/${project.id}`));
}
function parseResponse(response) {
    if (!response) {
        return null;
    }
    const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);
    if (id === "all") {
        return { name, id: "ditto_component_library" };
    }
    return { name, id };
}
async function promptForProject({ message, projects, limit = 10 }) {
    output.nl();
    const choices = projects.map(formatProjectChoice);
    const prompt = new AutoComplete({
        name: "project",
        message,
        limit,
        choices,
    });
    let response;
    try {
        response = await prompt.run();
    }
    catch (e) {
        // this catch handles the case where someone presses
        // Ctrl + C to kill the AutoComplete process
        response = null;
    }
    return parseResponse(response);
}
module.exports = promptForProject;
const ora = require("ora");
const api = require("../api").default;
const config = require("../config");
const consts = require("../consts");
const output = require("../output");
const { collectAndSaveToken } = require("../init/token");
const { getSelectedProjects, getIsUsingComponents, } = require("../utils/getSelectedProjects");
const promptForProject = require("../utils/promptForProject");
function quit(exitCode = 2) {
    console.log("\nExiting Ditto CLI...\n");
    process.exitCode = exitCode;
    process.exit();
}
function saveProject(file, name, id) {
    // old functionality included "ditto_component_library" in the `projects`
    // array, but we want to always treat the component library as a separate
    // entity and use the new notation of a top-level `components` key
    if (id === "components") {
        config.writeData(file, { components: true });
        return;
    }
    const projects = [...getSelectedProjects(), { name, id }];
    config.writeData(file, { projects });
}
function needsSource() {
    return !config.parseSourceInformation().hasSourceData;
}
async function askForAnotherToken() {
    config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
    const message = "Looks like the API key you have saved no longer works. Please enter another one.";
    await collectAndSaveToken(message);
}
async function listProjects(token, projectsAlreadySelected, componentsSelected) {
    const spinner = ora("Fetching projects in your workspace...");
    spinner.start();
    let projects = [];
    try {
        projects = await api.get("/project-names", {
            headers: {
                Authorization: `token ${token}`,
            },
        });
    }
    catch (e) {
        spinner.stop();
        throw e;
    }
    spinner.stop();
    return projects.data.filter(({ id }) => {
        if (id === "ditto_component_library") {
            return !componentsSelected;
        }
        else {
            return !projectsAlreadySelected.some((project) => project.id === id);
        }
    });
}
async function collectProject(token, initialize) {
    const path = process.cwd();
    if (initialize) {
        console.log(`Looks like there are no Ditto projects selected for your current directory: ${output.info(path)}.`);
    }
    const projectsAlreadySelected = getSelectedProjects();
    const usingComponents = getIsUsingComponents();
    const projects = await listProjects(token, projectsAlreadySelected, usingComponents);
    if (!(projects && projects.length)) {
        console.log("You're currently syncing all projects in your workspace.");
        console.log(output.warnText("Not seeing a project that you were expecting? Verify that developer mode is enabled on that project. More info: https://www.dittowords.com/docs/ditto-developer-mode"));
        return null;
    }
    const nonItitPrompt = usingComponents
        ? "Add a project"
        : "Add a project or library";
    return promptForProject({
        projects,
        message: initialize
            ? "Choose the project or library you'd like to sync text from"
            : nonItitPrompt,
    });
}
async function collectAndSaveProject(initialize = false) {
    try {
        const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
        const project = await collectProject(token, initialize);
        if (!project) {
            quit(0);
            return;
        }
        console.log("\n" +
            `Thanks for adding ${output.info(project.name)} to your selected projects.\n` +
            `We saved your updated configuration to: ${output.info(consts.PROJECT_CONFIG_FILE)}\n`);
        saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
    }
    catch (e) {
        console.log(e);
        if (e.response && e.response.status === 404) {
            await askForAnotherToken();
            await collectAndSaveProject();
        }
        else {
            quit();
        }
    }
}
module.exports = { needsSource, collectAndSaveProject };
const output = require("../output");
const projectsToText = require("./projectsToText");
function sourcesToText(projects, componentLibrary) {
    let message = "";
    if (componentLibrary) {
        message += `the ${output.info("Ditto Component Library")}`;
        if ((projects || []).length) {
            message += " and ";
        }
        else {
            message += "..";
        }
    }
    if ((projects || []).length) {
        message += `the following projects: ${projectsToText(projects)}\n`;
    }
    return message;
}
module.exports = sourcesToText;
// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require("boxen");
const chalk = require("chalk");
const projectsToText = require("../utils/projectsToText");
const { needsSource, collectAndSaveProject } = require("./project");
const { needsToken, collectAndSaveToken } = require("./token");
const config = require("../config");
const output = require("../output");
const sourcesToText = require("../utils/sourcesToText");
const needsInit = () => needsToken() || needsSource();
function welcome() {
    const msg = chalk.white(`${chalk.bold("Welcome to the", chalk.magentaBright("Ditto CLI"))}.

We're glad to have you here.`);
    console.log(boxen(msg, { padding: 1 }));
}
async function init() {
    welcome();
    if (needsToken()) {
        await collectAndSaveToken();
    }
    const { hasSourceData, validProjects, shouldFetchComponentLibrary } = config.parseSourceInformation();
    if (!hasSourceData) {
        await collectAndSaveProject(true);
        return;
    }
    const message = "You're currently set up to sync text from " +
        sourcesToText(validProjects, shouldFetchComponentLibrary);
    console.log(message);
}
module.exports = { needsInit, init };
const fs = require("fs");
const path = require("path");
const ora = require("ora");
const api = require("./api").default;
const config = require("./config");
const consts = require("./consts");
const output = require("./output");
const { collectAndSaveToken } = require("./init/token");
const projectsToText = require("./utils/projectsToText");
const sourcesToText = require("./utils/sourcesToText");
const NON_DEFAULT_FORMATS = ["flat", "structured"];
const DEFAULT_FORMAT_KEYS = ["projects", "exported_at"];
const hasVariantData = (data) => {
    const hasTopLevelKeys = Object.keys(data).filter((key) => !DEFAULT_FORMAT_KEYS.includes(key))
        .length > 0;
    const hasProjectKeys = data.projects && Object.keys(data.projects).length > 0;
    return hasTopLevelKeys || hasProjectKeys;
};
async function askForAnotherToken() {
    config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
    const message = "Looks like the API key you have saved no longer works. Please enter another one.";
    await collectAndSaveToken(message);
}
/**
 * For a given variant:
 * - if format is unspecified, fetch data for all projects from `/projects` and
 * save in `{variantApiId}.json`
 * - if format is `flat` or `structured`, fetch data for each project from `/project/:project_id` and
 * save in `{projectName}-${variantApiId}.json`
 */
async function downloadAndSaveVariant(variantApiId, projects, format, token) {
    const params = { variant: variantApiId };
    if (format) {
        params.format = format;
    }
    if (NON_DEFAULT_FORMATS.includes(format)) {
        const savedMessages = await Promise.all(projects.map(async ({ id, fileName }) => {
            const { data } = await api.get(`/projects/${id}`, {
                params,
                headers: { Authorization: `token ${token}` },
            });
            if (!hasVariantData(data)) {
                return "";
            }
            const filename = fileName + ("__" + (variantApiId || "base")) + ".json";
            const filepath = path.join(consts.TEXT_DIR, filename);
            const dataString = JSON.stringify(data, null, 2);
            fs.writeFileSync(filepath, dataString);
            return getSavedMessage(filename);
        }));
        return savedMessages.join("");
    }
    else {
        const { data } = await api.get("/projects", {
            params: { ...params, projectIds: projects.map(({ id }) => id) },
            headers: { Authorization: `token ${token}` },
        });
        if (!hasVariantData(data)) {
            return "";
        }
        const filename = `${variantApiId || "base"}.json`;
        const filepath = path.join(consts.TEXT_DIR, filename);
        const dataString = JSON.stringify(data, null, 2);
        fs.writeFileSync(filepath, dataString);
        return getSavedMessage(filename);
    }
}
/**
 * @param {{ meta: Object.<string, string> }} options
 */
async function downloadAndSaveVariants(projects, format, token, options) {
    const meta = options ? options.meta : {};
    const { data: variants } = await api.get("/variants", {
        params: {
            ...meta,
            projectIds: projects.map(({ id }) => id),
        },
        headers: { Authorization: `token ${token}` },
    });
    const messages = await Promise.all([
        downloadAndSaveVariant(null, projects, format, token),
        ...variants.map(({ apiID }) => downloadAndSaveVariant(apiID, projects, format, token)),
    ]);
    return messages.join("");
}
/**
 @param {{ meta: Object.<string, string> }} options
 */
async function downloadAndSaveBase(projects, format, token, options) {
    const meta = options ? options.meta : {};
    const params = {
        ...meta,
    };
    if (format) {
        params.format = format;
    }
    if (NON_DEFAULT_FORMATS.includes(format)) {
        const savedMessages = await Promise.all(projects.map(async ({ id, fileName }) => {
            const { data } = await api.get(`/projects/${id}`, {
                params,
                headers: { Authorization: `token ${token}` },
            });
            const filename = `${fileName}.json`;
            const filepath = path.join(consts.TEXT_DIR, filename);
            const dataString = JSON.stringify(data, null, 2);
            fs.writeFileSync(filepath, dataString);
            return getSavedMessage(filename);
        }));
        return savedMessages.join("");
    }
    else {
        const { data } = await api.get(`/projects`, {
            params: { ...params, projectIds: projects.map(({ id }) => id) },
            headers: { Authorization: `token ${token}` },
        });
        const dataString = JSON.stringify(data, null, 2);
        fs.writeFileSync(consts.TEXT_FILE, dataString);
        return getSavedMessage("text.json");
    }
}
function getSavedMessage(file) {
    return `Successfully saved to ${output.info(file)}\n`;
}
function cleanOutputFiles() {
    if (!fs.existsSync(consts.TEXT_DIR)) {
        fs.mkdirSync(consts.TEXT_DIR);
    }
    const fileNames = fs.readdirSync(consts.TEXT_DIR);
    fileNames.forEach((fileName) => {
        if (/\.js(on)?$/.test(fileName)) {
            fs.unlinkSync(path.resolve(consts.TEXT_DIR, fileName));
        }
    });
    return "Cleaning old output files..\n";
}
// compatability with legacy method of specifying project ids
// that is still used by the default format
const stringifyProjectId = (projectId) => projectId === "ditto_component_library" ? projectId : `project_${projectId}`;
/**
 * Generates an index.js file that can be consumed
 * by an SDK - this is a big DX improvement because
 * it provides a single entry point to get all data
 * (including variants) instead of having to import
 * each generated file individually.
 *
 * The generated file will have a unified format
 * independent of the CLI configuration used to fetch
 * data from Ditto.
 */
function generateJsDriver(projects, variants, format) {
    const fileNames = fs
        .readdirSync(consts.TEXT_DIR)
        .filter((fileName) => /\.json$/.test(fileName));
    const projectIdsByName = projects.reduce((agg, project) => ({ ...agg, [project.fileName]: project.id }), {});
    const data = fileNames.reduce((obj, fileName) => {
        // filename format: {project-name}__{variant-api-id}.json
        // file format: flat or structured
        if (variants && format) {
            const [projectName, rest] = fileName.split("__");
            const [variantApiId] = rest.split(".");
            const projectId = projectIdsByName[projectName];
            if (!projectId) {
                throw new Error(`Couldn't find id for ${projectName}`);
            }
            const projectIdStr = stringifyProjectId(projectId);
            if (!obj[projectIdStr]) {
                obj[projectIdStr] = {};
            }
            obj[projectIdStr][variantApiId] = `require('./${fileName}')`;
        }
        // filename format: {variant-api-id}.json
        // file format: default
        else if (variants) {
            const file = require(path.resolve(consts.TEXT_DIR, `./${fileName}`));
            const [variantApiId] = fileName.split(".");
            Object.keys(file.projects).forEach((projectId) => {
                if (!obj[projectId]) {
                    obj[projectId] = {};
                }
                const project = file.projects[projectId];
                obj[projectId][variantApiId] = project.frames || project.components;
            });
        }
        // filename format: {project-name}.json
        // file format: flat or structured
        else if (format) {
            const [projectName] = fileName.split(".");
            const projectId = projectIdsByName[projectName];
            if (!projectId) {
                throw new Error(`Couldn't find id for ${projectName}`);
            }
            obj[stringifyProjectId(projectId)] = { base: `require('./${fileName}')` };
        }
        // filename format: text.json (single file)
        // file format: default
        else {
            const file = require(path.resolve(consts.TEXT_DIR, `./${fileName}`));
            Object.keys(file.projects).forEach((projectId) => {
                const project = file.projects[projectId];
                obj[projectId] = { base: project.frames || project.components };
            });
        }
        return obj;
    }, {});
    let dataString = `module.exports = ${JSON.stringify(data, null, 2)}`
        // remove quotes around require statements
        .replace(/"require\((.*)\)"/g, "require($1)");
    const filePath = path.resolve(consts.TEXT_DIR, "index.js");
    fs.writeFileSync(filePath, dataString, { encoding: "utf8" });
    return `Generated .js SDK driver at ${output.info(filePath)}`;
}
/**
 * @param {{ meta: Object.<string, string> }} options
 */
async function downloadAndSave(sourceInformation, token, options) {
    const { validProjects, variants, format, shouldFetchComponentLibrary } = sourceInformation;
    let msg = `\nFetching the latest text from ${sourcesToText(validProjects, shouldFetchComponentLibrary)}\n`;
    const spinner = ora(msg);
    spinner.start();
    // We'll need to move away from this solution if at some
    // point down the road we stop allowing the component
    // library to be returned from the /projects endpoint
    if (shouldFetchComponentLibrary) {
        validProjects.push({
            id: "ditto_component_library",
            name: "Ditto Component Library",
            fileName: "ditto-component-library",
        });
    }
    try {
        msg += cleanOutputFiles();
        const meta = options ? options.meta : {};
        msg += variants
            ? await downloadAndSaveVariants(validProjects, format, token, { meta })
            : await downloadAndSaveBase(validProjects, format, token, { meta });
        msg += generateJsDriver(validProjects, variants, format);
        msg += `\n${output.success("Done")}!`;
        spinner.stop();
        return console.log(msg);
    }
    catch (e) {
        spinner.stop();
        let error = e.message;
        if (e.response && e.response.status === 404) {
            await askForAnotherToken();
            pull();
            return;
        }
        if (e.response && e.response.status === 401) {
            error = "You don't have access to the selected projects";
            msg = `${output.errorText(error)}.\nChoose others using the ${output.info("project")} command, or update your API key.`;
            return console.log(msg);
        }
        if (e.response && e.response.status === 403) {
            error =
                "One or more of the requested projects don't have Developer Mode enabled";
            msg = `${output.errorText(error)}.\nPlease choose different projects using the ${output.info("project")} command, or turn on Developer Mode for all selected projects. Learn more here: ${output.subtle("https://www.dittowords.com/docs/ditto-developer-mode")}.`;
            return console.log(msg);
        }
        if (e.response && e.response.status === 400) {
            error = "projects not found";
        }
        msg = `We hit an error fetching text from the projects: ${output.errorText(error)}.\nChoose others using the ${output.info("project")} command.`;
        return console.log(msg);
    }
}
/**
 * @param {{ meta: Object.<string, string> }} options
 */
function pull(options) {
    const meta = options ? options.meta : {};
    const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
    const sourceInformation = config.parseSourceInformation();
    return downloadAndSave(sourceInformation, token, { meta });
}
module.exports = {
    pull,
    _testing: {
        cleanOutputFiles,
        downloadAndSaveVariant,
        downloadAndSaveVariants,
        downloadAndSaveBase,
    },
};
//# sourceMappingURL=ditto.js.map