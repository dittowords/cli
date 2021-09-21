const fs = require("fs");
const path = require("path");

const ora = require("ora");

const api = require("./api").default;
const config = require("./config");
const consts = require("./consts");
const output = require("./output");
const { collectAndSaveToken } = require("./init/token");
const projectsToText = require("./utils/projectsToText");

async function askForAnotherToken() {
  config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
  const message =
    "Looks like the API key you have saved no longer works. Please enter another one.";
  await collectAndSaveToken(message);
}

async function downloadAndSaveVariant(variantApiId, projectIds, format) {
  const params = { projectIds };
  if (variantApiId) {
    params.variant = variantApiId;
  }
  if (format) {
    params.format = format;
  }

  const { data } = await api.get("/projects", { params });

  const filename = `${variantApiId || "base"}.json`;
  const filepath = path.join(consts.TEXT_DIR, filename);

  const dataString = JSON.stringify(data, null, 2);

  fs.writeFileSync(filepath, dataString);

  return getSavedMessage(filename);
}

async function downloadAndSaveVariants(projectIds, format) {
  const { data: variants } = await api.get("/variants");

  const messages = await Promise.all([
    downloadAndSaveVariant(null, projectIds, format),
    ...variants.map(({ apiID }) =>
      downloadAndSaveVariant(apiID, projectIds, format)
    ),
  ]);

  return messages.join("");
}

async function downloadAndSaveBase(projectIds, format) {
  const params = { projectIds };
  if (format) {
    params.format = format;
  }

  const { data } = await api.get(`/projects`, { params });
  const dataString = JSON.stringify(data, null, 2);

  fs.writeFileSync(consts.TEXT_FILE, dataString);

  return getSavedMessage("text.json");
}

function getSavedMessage(file) {
  return `Successfully saved to ${output.info(file)}.\n`;
}

function cleanOutputFiles() {
  if (!fs.existsSync(consts.TEXT_DIR)) {
    fs.mkdirSync(consts.TEXT_DIR);
  }

  const fileNames = fs.readdirSync(consts.TEXT_DIR);
  fileNames.forEach((fileName) => {
    if (/\.json$/.test(fileName)) {
      fs.unlinkSync(path.resolve(consts.TEXT_DIR, fileName));
    }
  });

  return "Cleaning old output files..\n";
}

async function downloadAndSave(projectConfig) {
  const { projects, variants, format } = projectConfig;

  const projectNames = [];
  const projectIds = [];

  projects.forEach(({ name, id }) => {
    projectNames.push(name);
    projectIds.push(id);
  });

  let msg = `\nFetching the latest text from your selected projects: ${projectsToText(
    projects
  )}\n`;

  const spinner = ora(msg);
  spinner.start();

  try {
    msg += cleanOutputFiles();

    msg += variants
      ? await downloadAndSaveVariants(projectIds, format)
      : await downloadAndSaveBase(projectIds, format);

    msg += `\n${output.success("Done")}!`;

    spinner.stop();
    return console.log(msg);
  } catch (e) {
    spinner.stop();
    let error = e.message;
    if (e.response && e.response.status === 404) {
      await askForAnotherToken();
      pull();
      return;
    }
    if (e.response && e.response.status === 401) {
      error = "You don't have access to the selected projects";
      msg = `${output.errorText(error)}.\nChoose others using the ${output.info(
        "project"
      )} command, or update your API key.`;
      return console.log(msg);
    }
    if (e.response && e.response.status === 403) {
      error =
        "One or more of the requested projects don't have Developer Mode enabled";
      msg = `${output.errorText(
        error
      )}.\nPlease choose different projects using the ${output.info(
        "project"
      )} command, or turn on Developer Mode for all selected projects. Learn more here: ${output.subtle(
        "https://www.dittowords.com/docs/ditto-developer-mode"
      )}.`;
      return console.log(msg);
    }
    if (e.response && e.response.status === 400) {
      error = "projects not found";
    }
    msg = `We hit an error fetching text from the projects: ${output.errorText(
      error
    )}.\nChoose others using the ${output.info("project")} command.`;
    return console.log(msg);
  }
}

function pull() {
  const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
  const pConfig = config.readData(consts.PROJECT_CONFIG_FILE);
  return downloadAndSave(pConfig, token);
}

module.exports = pull;
