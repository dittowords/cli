// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require('boxen');
const chalk = require('chalk');
const projectsToText = require('../utils/projectsToText');

const { needsProjects, collectAndSaveProject } = require('./project');
const { needsToken, collectAndSaveToken } = require('./token');

const needsInit = () => (needsToken() || !(needsProjects()).exists);

function welcome() {
  const msg = chalk.white(`${chalk.bold('Welcome to the',
    chalk.magentaBright('Ditto CLI'))}.

We're glad to have you here.`);
  console.log(boxen(msg, { padding: 1 }));
}

async function init() {
  welcome();
  if (needsToken()) {
    await collectAndSaveToken();
  }
  const savedProjectInfo = needsProjects();
  if (savedProjectInfo.exists) {
    const { projects } = savedProjectInfo;
    console.log(`You're currently set up to sync text from the following projects: ${projectsToText(projects)}\n`);
  } else {
    await collectAndSaveProject(true);
  }
}

module.exports = { needsInit, init };
