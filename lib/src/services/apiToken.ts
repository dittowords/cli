import appContext from "../utils/appContext";
import fs from "fs";
import URL from "url";
import * as configService from "./globalConfig";
import checkToken from "../http/checkToken";
import logger from "../utils/logger";
import { quit } from "../utils/quit";
import * as Sentry from "@sentry/node";
import { prompt } from "enquirer";

/**
 * Initializes the API token
 * @param token The token to initialize the API token with. If not provided, the token will be fetched from the global config file.
 * @param configFile The path to the global config file
 * @param host The host to initialize the API token for
 * @returns The initialized API token
 */
export async function initAPIToken(
  token: string | undefined = appContext.apiToken,
  configFile: string = appContext.configFile,
  host: string = appContext.apiHost
) {
  if (token) {
    return await validateToken(token);
  }

  if (!fs.existsSync(configFile)) {
    return await collectAndSaveToken();
  }

  const configData = configService.readGlobalConfigData(configFile);
  const sanitizedHost = getURLHostname(host);

  if (
    !configData[sanitizedHost] ||
    !configData[sanitizedHost][0] ||
    configData[sanitizedHost][0].token === ""
  ) {
    return await collectAndSaveToken(sanitizedHost);
  }

  return await validateToken(configData[sanitizedHost][0].token);
}

/**
 * Collects a token from the user and saves it to the global config file
 * @param host The host to save the token for
 * @returns The collected token
 */
async function collectAndSaveToken(host: string = appContext.apiHost) {
  try {
    const token = await collectToken();
    logger.writeLine(
      `Thanks for authenticating.  We'll save the key to: ${logger.info(
        appContext.configFile
      )}\n`
    );
    const sanitizedHost = getURLHostname(host);
    configService.saveToken(appContext.configFile, sanitizedHost, token);
    appContext.setApiToken(token);
    return token;
  } catch (error) {
    // https://github.com/enquirer/enquirer/issues/225#issue-516043136
    // Empty string corresponds to the user hitting Ctrl + C
    if (error === "") {
      await quit("", 0);
      return "";
    }

    const eventId = Sentry.captureException(error);
    const eventStr = `\n\nError ID: ${logger.info(eventId)}`;

    await quit(
      logger.errorText(
        "Something went wrong. Please contact support or try again later."
      ) + eventStr
    );
    return "";
  }
}

/**
 * Outputs instructions to the user and collects an API token
 * @returns The collected token
 */
async function collectToken() {
  const apiUrl = logger.url("https://app.dittowords.com/account/devtools");
  const breadcrumbs = logger.bold(logger.info("API Keys"));
  const tokenDescription = `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} under "${breadcrumbs}".`;

  logger.writeLine(tokenDescription);

  const response = await promptForApiToken();
  return response.token;
}

/**
 * Prompt the user for an API token
 * @returns The collected token
 */
async function promptForApiToken() {
  const response = await prompt<{ token: string }>({
    type: "input",
    name: "token",
    message: "What is your API key?",
    // @ts-expect-error - Enquirer types are not updated for the validate function
    validate: async (token) => {
      console.log("token", token);
      const result = await checkToken(token);
      if (!result.success) {
        return result.output?.join("\n") || "Invalid API key";
      }
      return true;
    },
  });

  return response;
}

/**
 * Get the hostname from a URL string
 * @param hostString
 * @returns
 */
function getURLHostname(hostString: string) {
  if (!hostString.includes("://")) return hostString;
  return URL.parse(hostString).hostname || "";
}

/**
 * Validate a token
 * @param token  The token to validate
 * @returns The newly validated token
 */
async function validateToken(token: string) {
  const response = await checkToken(token);
  if (!response.success) {
    return await collectAndSaveToken();
  }

  return token;
}

export const _test = {
  collectToken,
  validateToken,
  getURLHostname,
  promptForApiToken,
};
