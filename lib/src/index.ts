#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import * as Sentry from "@sentry/node";
import { program } from "commander";
import { pull } from "./commands/pull";
import { quit } from "./utils/quit";
import { version } from "../../package.json";
import output from "./utils/output";
import { initAPIToken } from "./services/apiToken";
import { initProjectConfig } from "./services/projectConfig";

type Command = "pull";

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

    // if ("commands" in commandConfig && commandConfig.commands) {
    //   commandConfig.commands.forEach((nestedCommand) => {
    //     cmd
    //       .command(nestedCommand.name)
    //       .description(nestedCommand.description)
    //       .action((str, options) => {
    //         if (commandConfig.name === "project") {
    //           const command =
    //             `${commandConfig.name} ${nestedCommand.name}` as Command;

    //           return executeCommand(command, options);
    //         }
    //       });
    //   });
    // }
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
  try {
    await initAPIToken();
    await initProjectConfig();

    switch (command) {
      case "none":
      case "pull": {
        return await pull();
      }
      default: {
        await quit("Exiting Ditto CLI...");
        return;
      }
    }
  } catch (error) {
    const eventId = Sentry.captureException(error);
    const eventStr = `\n\nError ID: ${output.info(eventId)}`;

    if (process.env.IS_LOCAL === "true") {
      console.error(output.info("Development stack trace:\n"), error);
    }

    return await quit(
      output.errorText(
        "Something went wrong. Please contact support or try again later."
      ) + eventStr
    );
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
