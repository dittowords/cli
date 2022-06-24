#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import { program } from "commander";
// to use V8's code cache to speed up instantiation time
import "v8-compile-cache";

import { init, needsInit } from "./init/init";
import { pull } from "./pull";

import addProject from "./add-project";
import removeProject from "./remove-project";
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

  const projectDescription = "Add a Ditto project to sync copy from";
  const projectCommand = program
    .command("project")
    .description(projectDescription)
    .action(() => checkInit("project"));

  projectCommand
    .command("add")
    .description(projectDescription)
    .action(() => checkInit("project"));

  projectCommand
    .command("remove")
    .description("Stop syncing copy from a Ditto project")
    .action(() => checkInit("project remove"));
};

const setupOptions = () => {
  program.option(
    "-m, --meta <data...>",
    "Optional metadata for this command to send arbitrary data to the backend. Ex: -m githubActionRequest:true trigger:manual"
  );
};

const checkInit = async (command) => {
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
      case "project":
      case "project add":
        addProject();
        break;
      case "project remove":
        removeProject();
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
