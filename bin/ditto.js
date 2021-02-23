#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
const { program } = require('commander');
// to use V8's code cache to speed up instantiation time
require('v8-compile-cache');

const { init, needsInit } = require('../lib/init/init');
const pull = require('../lib/pull');
const selectProject = require('../lib/select-project');

/**
 * Catch and report unexpected error.
 * @param {any} error The thrown error object.
 * @returns {void}
 */
function quit() {
  process.exitCode = 2;
  process.exit();
}

const main = async () => {
  if (needsInit()) {
    try {
      await init();
    } catch (error) {
      quit();
    }
  } else {
    program
      .command('pull')
      .description('Pull copy from Ditto into working directory')
      .action(pull);
    program
      .command('project')
      .description('Select Ditto project to pull copy from')
      .action(selectProject);
    program.parse(process.argv);
  }
};

main();
