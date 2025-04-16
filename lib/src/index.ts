#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import * as Sentry from "@sentry/node";
import { program } from "commander";
import { pull } from "./commands/pull";
import { quit } from "./utils/quit";
import { version } from "../../package.json";
import logger from "./utils/logger";
import initAPIToken from "./services/apiToken/initAPIToken";
import { initProjectConfig } from "./services/projectConfig";
import appContext from "./utils/appContext";

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
    const token = await initAPIToken();
    appContext.setApiToken(token);

    await initProjectConfig();

    switch (command) {
      case "none":
      case "pull": {
        return await pull();
      }
      default: {
        await quit(`Invalid command: ${command}. Exiting Ditto CLI...`);
        return;
      }
    }
  } catch (error) {
    const eventId = Sentry.captureException(error);
    const eventStr = `\n\nError ID: ${logger.info(eventId)}`;

    if (process.env.DEBUG === "true") {
      console.error(logger.info("Development stack trace:\n"), error);
    }

    return await quit(
      logger.errorText(
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
