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
import { replace } from "./replace";
import { generateSuggestions } from "./generate-suggestions";

import processMetaOption from "./utils/processMetaOption";

type Command =
  | "pull"
  | "project"
  | "project add"
  | "project remove"
  | "generate-suggestions"
  | "replace";

interface CommandConfig<T extends Command | "add" | "remove"> {
  name: T;
  description: string;
  commands?: CommandConfig<"add" | "remove">[];
  flags?: {
    [flag: string]: { description: string; processor?: (value: string) => any };
  };
}

const COMMANDS: CommandConfig<Command>[] = [
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
  {
    name: "generate-suggestions",
    description: "Find text that can be potentially replaced with Ditto text",
    flags: {
      "-d, --directory [value]": {
        description: "Directory to search for text",
      },
    },
  },
  {
    name: "replace",
    description: "Find and replace Ditto text with code",
    flags: {
      "-ln, --line-numbers [value]": {
        description: "Only replace text on a specific line number",
        processor: (value: string) => value.split(",").map(Number),
      },
    },
  },
];

const setupCommands = () => {
  program.name("ditto-cli");

  COMMANDS.forEach((commandConfig) => {
    const cmd = program
      .command(commandConfig.name)
      .description(commandConfig.description)
      .action((options) => {
        return executeCommand(commandConfig.name, options);
      });

    if (commandConfig.flags) {
      Object.entries(commandConfig.flags).forEach(
        ([flags, { description, processor }]) => {
          cmd.option(flags, description, processor);
        }
      );
    }

    if ("commands" in commandConfig && commandConfig.commands) {
      commandConfig.commands.forEach((nestedCommand) => {
        cmd
          .command(nestedCommand.name)
          .description(nestedCommand.description)
          .action((str, options) => {
            if (commandConfig.name === "project") {
              const command =
                `${commandConfig.name} ${nestedCommand.name}` as Command;
              return executeCommand(command, options);
            }
          });
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

const executeCommand = async (
  command: Command | "none",
  options: any
): Promise<void> => {
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
    case "generate-suggestions": {
      return generateSuggestions({
        ...(options.directory ? { directory: options.directory } : {}),
      });
    }
    case "replace": {
      return replace(options.args, {
        ...(options.lineNumbers ? { lineNumbers: options.lineNumbers } : {}),
      });
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
    await executeCommand("none", []);
    return;
  }

  program.parse(process.argv);
};

main();
