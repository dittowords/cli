// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require('boxen');
const chalk = require('chalk');

const { needsProject, collectAndSaveProject } = require('./project');
const { needsToken, collectAndSaveToken } = require('./token');

// TODO: This should quick check for a config file with a key.
const needsInit = () => (needsToken() || (needsProject()).empty);

function welcome() {
  const msg = chalk.white(`${chalk.bold('Welcome to the',
    chalk.magentaBright('Ditto CLI'))}.

We're glad to have you here.`);
  console.log(boxen(msg, { padding: 1 }));
}

async function init() {
  welcome();
  if (needsToken()) await collectAndSaveToken();
  const savedProjectInfo = needsProject();
  if (savedProjectInfo.empty) {
    await collectAndSaveProject();
  } else {
    const { name, id } = savedProjectInfo;
    console.log("You're currently set up to pull text from the following project: " + chalk.blue(name) + " (id: " + id + ").");
    console.log('\n');
  }
}

module.exports = { needsInit, init };
