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
  const msg = chalk.white(`${chalk.bold(
    "Welcome to the",
    chalk.magentaBright("Ditto CLI")
  )}.

We're glad to have you here.`);
  console.log(boxen(msg, { padding: 1 }));
}

async function init() {
  welcome();

  if (needsToken()) {
    await collectAndSaveToken();
  }

  const { hasSourceData, validProjects, shouldFetchComponentLibrary } =
    config.parseSourceInformation();

  if (!hasSourceData) {
    await collectAndSaveProject(true);
    return;
  }

  const message =
    "You're currently set up to sync text from " +
    sourcesToText(validProjects, shouldFetchComponentLibrary);

  console.log(message);
}

module.exports = { needsInit, init };
