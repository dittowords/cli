#!/usr/bin/env node
// This is the main entry point for the ditto-cli command.
import * as Sentry from "@sentry/node";
import { program } from "commander";
import { login } from "./commands/login";
import { pull } from "./commands/pull";
import { scan } from "./commands/scan";
import { quit } from "./utils/quit";
import { version } from "../../package.json";
import logger from "./utils/logger";
import initAPIToken from "./services/apiToken/initAPIToken";
import { initProjectConfig } from "./services/projectConfig";
import appContext from "./utils/appContext";
import { ErrorType, isDittoError, isDittoErrorType } from "./utils/DittoError";
import processCommandMetaFlag from "./utils/processCommandMetaFlag";

const handleCommandError = async (error: any) => {
  if (process.env.DEBUG === "true") {
    console.error(logger.info("Development stack trace:\n"), error);
  }

  let sentryOptions = undefined;
  let exitCode = undefined;
  let errorText =
    error.message ||
    "Something went wrong. Please contact support or try again later.";

  if (isDittoError(error)) {
    exitCode = error.exitCode;

    if (isDittoErrorType(error, ErrorType.ConfigYamlLoadError)) {
      errorText = error.message;
    } else if (isDittoErrorType(error, ErrorType.ConfigParseError)) {
      errorText = `${error.data.messagePrefix}\n\n${error.data.formattedError}`;
    }

    if (error.expected) {
      return await quit(logger.errorText(errorText), exitCode);
    }

    sentryOptions = {
      extra: { message: errorText, ...(error.data || {}) },
    };
  }

  const eventId = Sentry.captureException(error, sentryOptions);
  const eventStr = `\n\nError ID: ${logger.info(eventId)}`;

  return await quit(logger.errorText(errorText) + eventStr, exitCode);
};

const appEntry = async () => {
  program.name("ditto-cli");

  // ditto login
  program
    .command("login")
    .description("Save your Ditto API key on this computer")
    .action(async () => {
      try {
        return await login();
      } catch (error) {
        handleCommandError(error);
      }
    });

  // ditto pull
  program
    .command("pull")
    .description("Sync copy from Ditto")
    .option(
      "-c, --config [value]",
      "Relative path to the project config file. Defaults to `./ditto/config.yml`. Alternatively, you can set the DITTO_PROJECT_CONFIG_FILE environment variable."
    )
    .option(
      "-m, --meta <data...>",
      "Include arbitrary data in requests to the Ditto API. Ex: -m githubActionRequest:true trigger:manual"
    )
    .option("--legacy", "Run in legacy mode")
    .action(async (opts: { config?: string; meta?: string[] }) => {
      try {
        const token = await initAPIToken();
        appContext.setApiToken(token);
        await initProjectConfig(opts);
        return await pull(processCommandMetaFlag(opts.meta ?? null));
      } catch (error) {
        handleCommandError(error);
      }
    });

  // ditto scan
  program
    .command("scan [path]")
    .description(
      "Scan a codebase for user-facing strings and send them to Ditto. Defaults to the current directory if no path is given."
    )
    .option(
      "--local",
      "outputs the candidates file locally to the out-dir with the given prefix",
      false
    )
    .option("--out-dir <dir>", "output directory", "")
    .option("--prefix <prefix>", "prefix for output files", "")
    .option(
      "--list-directories",
      "print the number of candidate strings per directory and exit, without uploading",
      false
    )
    .action(
      async (
        inputPath: string | undefined,
        opts: {
          local: boolean;
          outDir: string;
          prefix?: string;
          listDirectories?: boolean;
        }
      ) => {
        try {
          return await scan(inputPath ?? ".", opts);
        } catch (error) {
          handleCommandError(error);
        }
      }
    );

  program.version(version, "-v, --version", "Output the current version");
  program.parse(process.argv);
};

export default appEntry;
