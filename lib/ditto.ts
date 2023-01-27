#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import { program } from "commander";
// to use V8's code cache to speed up instantiation time
import "v8-compile-cache";

import { init, needsInit } from "./init/init";
import { pull } from "./pull";

import processMetaOption from "./utils/processMetaOption";

/**
 * Catch and report unexpected error.
 * @param {any} error The thrown error object.
 * @returns {void}
 */
function quit(exitCode = 2) {
  console.log("\nExiting Ditto CLI...\n");
  process.exitCode = exitCode;
  process.exit();
}

const setupCommands = () => {
  program.name("ditto-cli");
  program
    .command("pull")
    .description("Sync copy from Ditto into working directory")
    .action(() => checkInit("pull"));
};

const setupOptions = () => {
  program.option(
    "-m, --meta <data...>",
    "Optional metadata for this command to send arbitrary data to the backend. Ex: -m githubActionRequest:true trigger:manual"
  );
};

const checkInit = async (command: string) => {
  if (needsInit() && command !== "project remove") {
    try {
      await init();
      if (command === "pull") main(); // re-run to actually pull text now that init is finished
    } catch (error) {
      quit();
    }
  } else {
    const { meta } = program.opts();
    switch (command) {
      case "pull":
        pull({ meta: processMetaOption(meta) });
        break;
      case "none":
        setupCommands();
        program.help();
        break;
      default:
        quit();
    }
  }
};

const main = async () => {
  if (process.argv.length <= 2 && process.argv[1].includes("ditto-cli")) {
    await checkInit("none");
  } else {
    setupCommands();
    setupOptions();
  }
  program.parse(process.argv);
};

main();
