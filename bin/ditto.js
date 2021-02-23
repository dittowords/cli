#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
const { program } = require('commander');
// to use V8's code cache to speed up instantiation time
require('v8-compile-cache');

const { init, needsInit } = require('../lib/init/init');
const pull = require('../lib/pull');

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
      .description('pull copy from ditto into working directory')
      .action(pull);
    program.parse(process.argv);
  }
};

main();
