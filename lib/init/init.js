// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require('boxen');
const chalk = require('chalk');

const { needsProject, collectAndSaveProject } = require('./project');
const { needsToken, collectAndSaveToken } = require('./token');

// TODO: This should quick check for a config file with a key.
const needsInit = () => (needsToken() || needsProject());

function welcome() {
  const msg = chalk.white(`${chalk.bold('Welcome to',
    chalk.magentaBright('ditto'))}.

We're glad to have you here.`);
  console.log(boxen(msg, { padding: 1 }));

  console.log('\n');
  console.log(chalk.white('We have a few questions to ask before we can get started.'));
  console.log('\n');
}

async function init() {
  welcome();
  if (needsToken()) await collectAndSaveToken();
  if (needsProject()) await collectAndSaveProject();
}

module.exports = { needsInit, init };
