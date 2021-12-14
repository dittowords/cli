// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require("boxen");
const chalk = require("chalk");
const projectsToText = require("../utils/projectsToText");

const { needsProjects, collectAndSaveProject } = require("./project");
const { needsToken, collectAndSaveToken } = require("./token");

const config = require("../config");
const output = require("../output");

const needsInit = () => needsToken() || needsProjects();

function welcome() {
  const msg = chalk.white(`${chalk.bold(
    "Welcome to the",
    chalk.magentaBright("Ditto CLI")
  )}.

We're glad to have you here.`);
  console.log(boxen(msg, { padding: 1 }));
}

function syncMessage(projects, shouldFetchComponentLibrary) {
  let message = "You're currently set up to sync text from ";

  if (shouldFetchComponentLibrary) {
    message += `the ${output.info("Component Library")}`;

    if (projects.length) {
      message += " and ";
    } else {
      message += ".";
    }
  }

  if (projects.length) {
    message += ` the following projects: ${projectsToText(projects)}\n`;
  }

  return message;
}

async function init() {
  welcome();

  if (needsToken()) {
    await collectAndSaveToken();
  }

  const { hasRequiredData, validProjects, shouldFetchComponentLibrary } =
    config.parseProjectInformation();

  if (!hasRequiredData) {
    await collectAndSaveProject(true);
    return;
  }

  const message = syncMessage(validProjects, shouldFetchComponentLibrary);

  console.log(message);
}

module.exports = { needsInit, init };
