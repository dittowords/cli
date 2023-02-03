#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import { program } from "commander";
// to use V8's code cache to speed up instantiation time
import "v8-compile-cache";

import { init, needsTokenOrSource } from "./init/init";
import { pull } from "./pull";
import { quit } from "./utils/quit";

import processMetaOption from "./utils/processMetaOption";

const supportedCommands = [
  {
    name: "pull",
    description: "Sync copy from Ditto into the current working directory",
  },
] as const;

type Command = typeof supportedCommands[number]["name"];

const setupCommands = () => {
  program.name("ditto-cli");
  supportedCommands.forEach((command) => {
    program
      .command(command.name)
      .description(command.description)
      .action(() => executeCommand(command.name));
  });
};

const setupOptions = () => {
  program.option(
    "-m, --meta <data...>",
    "Include arbitrary data in requests to the Ditto API. Ex: -m githubActionRequest:true trigger:manual"
  );
};

const executeCommand = async (command: Command | "none"): Promise<void> => {
  if (needsTokenOrSource()) {
    try {
      await init();
    } catch (error) {
      quit("Exiting Ditto CLI...");
      return;
    }
  }

  const { meta } = program.opts();
  switch (command) {
    case "none":
    case "pull": {
      pull({ meta: processMetaOption(meta) });
      return;
    }
    default: {
      quit("Exiting Ditto CLI...");
      return;
    }
  }
};

const main = async () => {
  setupCommands();
  setupOptions();

  if (process.argv.length <= 2 && process.argv[1].includes("ditto-cli")) {
    await executeCommand("none");
    return;
  }

  program.parse(process.argv);
};

main();
