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
import type commander from "commander";
import { ErrorType, isDittoError, isDittoErrorType } from "./utils/DittoError";

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
    description: "Sync copy from Ditto",
    flags: {
      "-c, --config [value]": {
        description:
          "Relative path to the project config file. Defaults to `./ditto/config.yml`. Alternatively, you can set the DITTO_PROJECT_CONFIG_FILE environment variable.",
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
  commandName: Command | "none",
  command: commander.Command
): Promise<void> => {
  try {
    const options = command.opts();
    const token = await initAPIToken();
    appContext.setApiToken(token);

    await initProjectConfig(options);

    switch (commandName) {
      case "none":
      case "pull": {
        return await pull();
      }
      default: {
        await quit(`Invalid command: ${commandName}. Exiting Ditto CLI...`);
        return;
      }
    }
  } catch (error) {
    if (process.env.DEBUG === "true") {
      console.error(logger.info("Development stack trace:\n"), error);
    }

    let sentryOptions = undefined;
    let exitCode = undefined;
    let errorText =
      "Something went wrong. Please contact support or try again later.";

    if (isDittoError(error)) {
      exitCode = error.exitCode;

      if (isDittoErrorType(error, ErrorType.ConfigYamlLoadError)) {
        errorText = error.message;
      } else if (isDittoErrorType(error, ErrorType.ConfigParseError)) {
        errorText = `${error.data.messagePrefix}\n\n${error.data.formattedError}`;
      }

      sentryOptions = {
        extra: { message: errorText, ...(error.data || {}) },
      };
    }

    const eventId = Sentry.captureException(error, sentryOptions);
    const eventStr = `\n\nError ID: ${logger.info(eventId)}`;

    return await quit(logger.errorText(errorText) + eventStr, exitCode);
  }
};

const appEntry = async () => {
  setupCommands();
  setupOptions();

  program.parse(process.argv);
};

export default appEntry;
