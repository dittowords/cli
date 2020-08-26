#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.

// to use V8's code cache to speed up instantiation time
require('v8-compile-cache');

const { init, needsInit } = require('../lib/init/init');
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
  process.on('uncaughtException', onFatalError);
  if (!process.env.DEBUG) process.on('unhandledRejection', onFatalError);

  if (needsInit()) {
    init();
  }

  // then do the help prompt
  // import
  // import --project
  // import --project -- frame
  // see diffs (store cached diffs)
};

main().catch(onFatalError);
