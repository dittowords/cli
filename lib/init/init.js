// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require('boxen');
const chalk = require('chalk');
const output = require('../output');

const { needsProject, collectAndSaveProject } = require('./project');
const { needsToken, collectAndSaveToken } = require('./token');

const needsInit = () => (needsToken() || !(needsProject()).exists);

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
  const savedProjectInfo = needsProject();
  if (savedProjectInfo.exists) {
    const { name, id } = savedProjectInfo;
    console.log("\nYou're currently set up to sync text from the following project: " + output.info(name) + " " + output.subtle('https://beta.dittowords.com/doc/' + id));
    console.log('\n');
  } else {
    await collectAndSaveProject(true);
  }
}

module.exports = { needsInit, init };
