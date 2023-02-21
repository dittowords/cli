#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import { program } from "commander";
// to use V8's code cache to speed up instantiation time
import "v8-compile-cache";

import { init, needsTokenOrSource } from "./init/init";
import { pull } from "./pull";
import { quit } from "./utils/quit";
import addProject from "./add-project";
import removeProject from "./remove-project";

import processMetaOption from "./utils/processMetaOption";

type Command = "pull" | "project" | "project add" | "project remove";

const COMMANDS = [
  {
    name: "pull",
    description: "Sync copy from Ditto into the current working directory",
  },
  {
    name: "project",
    description: "Add a Ditto project to sync copy from",
    commands: [
      {
        name: "add",
        description: "Add a Ditto project to sync copy from",
      },
      {
        name: "remove",
        description: "Stop syncing copy from a Ditto project",
      },
    ],
  },
] as const;

const setupCommands = () => {
  program.name("ditto-cli");

  COMMANDS.forEach((config) => {
    const cmd = program
      .command(config.name)
      .description(config.description)
      .action(() => executeCommand(config.name));

    if ("commands" in config) {
      config.commands.forEach((nestedCommand) => {
        cmd
          .command(nestedCommand.name)
          .description(nestedCommand.description)
          .action(() => executeCommand(`${config.name} ${nestedCommand.name}`));
      });
    }
  });
};

const setupOptions = () => {
  program.option(
    "-m, --meta <data...>",
    "Include arbitrary data in requests to the Ditto API. Ex: -m githubActionRequest:true trigger:manual"
  );
};

const executeCommand = async (command: Command | "none"): Promise<void> => {
  const needsInitialization = needsTokenOrSource();
  if (needsInitialization) {
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
      return pull({ meta: processMetaOption(meta) });
    }
    case "project":
    case "project add": {
      // initialization already includes the selection of a source,
      // so if `project add` is called during initialization, don't
      // prompt the user to select a source again
      if (needsInitialization) return;

      return addProject();
    }
    case "project remove": {
      return removeProject();
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
