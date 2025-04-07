#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import { program } from "commander";
import { pull } from "./commands/pull";
import { quit } from "./utils/quit";
import { version } from "../../package.json";

const CONFIG_FILE_RELIANT_COMMANDS = [
  "pull",
  "none",
  "project",
  "project add",
  "project remove",
];

type Command =
  | "pull"
  | "project"
  | "project add"
  | "project remove"
  | "component-folders"
  | "generate-suggestions"
  | "replace"
  | "import-components";

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
          if (processor) {
            cmd.option(flags, description, processor);
          } else {
            cmd.option(flags, description);
          }
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
  program.option("-l, --legacy", "Run in legacy mode");
  program.version(version, "-v, --version", "Output the current version");
};

const executeCommand = async (
  command: Command | "none",
  options: any
): Promise<void> => {
  switch (command) {
    case "none":
    case "pull": {
      return pull();
    }
    default: {
      await quit("Exiting Ditto CLI...");
      return;
    }
  }
};

const appEntry = async () => {
  setupCommands();
  setupOptions();

  if (process.argv.length <= 2 && process.argv[1].includes("ditto-cli")) {
    await executeCommand("none", []);
    return;
  }

  program.parse(process.argv);
};

export default appEntry;
