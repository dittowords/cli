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
import { YAML_PARSE_ERROR, YAML_LOAD_ERROR } from "./utils/errors";

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
    let errorText =
      "Something went wrong. Please contact support or try again later.";

    if (error instanceof Error) {
      sentryOptions = { extra: { message: error.message, cause: error.cause } };

      switch (error.message) {
        case YAML_LOAD_ERROR:
          errorText =
            "Could not load the project config file. Please check the file path and that it is a valid YAML file.";
          break;
        case YAML_PARSE_ERROR:
          if (Array.isArray(error.cause) && error.cause.length > 0) {
            const invalidKeys = Array.from(
              new Set(
                error.cause
                  .map((issue) => issue.keys)
                  .flat()
                  .filter(Boolean)
              )
            );
            const invalidValues = Array.from(
              new Set(
                error.cause
                  .map((issue) => issue.path)
                  .flat()
                  .filter(Boolean)
              )
            );

            if (invalidKeys.length) {
              errorText = `Could not parse the project config file. Please remove or rename the following fields: ${invalidKeys.join(
                ", "
              )}.`;
            } else if (invalidValues.length) {
              errorText = `Could not parse the project config file. Please check the following fields: ${invalidValues.join(
                ", "
              )}.`;
            }
          } else {
            errorText =
              "Could not parse the project config file. Please check the file format.";
          }
          break;
      }
    }

    const eventId = Sentry.captureException(error, sentryOptions);
    const eventStr = `\n\nError ID: ${logger.info(eventId)}`;

    return await quit(logger.errorText(errorText) + eventStr);
  }
};

const appEntry = async () => {
  setupCommands();
  setupOptions();

  program.parse(process.argv);
};

export default appEntry;
