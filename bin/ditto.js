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
function onFatalError() {
  process.exitCode = 2;

  // eslint-disable-next-line global-require
  const { version } = require('../package.json');

  console.error(`
Oops! Something went wrong! ¯\\_(ツ)_/¯

ditto-cli: ${version}
`);

  process.exit();
}

const main = async () => {
  if (!process.env.DEBUG) {
    process.on('uncaughtException', onFatalError);
    process.on('unhandledRejection', onFatalError);
  }

  if (needsInit()) {
    init();
  } else {
    program
      .command('pull')
      .description('pull copy from ditto into working directory')
      .action(pull);
    program.parse(process.argv);
  }
};

main();
