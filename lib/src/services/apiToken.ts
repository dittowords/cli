import appContext from "../utils/appContext";
import fs from "fs";
import URL from "url";
import * as configService from "./globalConfig";
import checkToken from "../http/checkToken";
import output from "../utils/output";
import { quit } from "../utils/quit";
import * as Sentry from "@sentry/node";
import { prompt } from "enquirer";

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
    return await collectAndSaveToken();
  }

  appContext.setApiToken(configData[sanitizedHost][0].token);

  return await validateToken(configData[sanitizedHost][0].token);
}

/**
 *
 * @param {string | null} message
 * @returns
 */
export const collectAndSaveToken = async (message: string | null = null) => {
  try {
    const token = await collectToken(message);
    output.write(
      `Thanks for authenticating.  We'll save the key to: ${output.info(
        appContext.configFile
      )}\n`
    );

    configService.saveToken(appContext.configFile, appContext.apiHost, token);
    return token;
  } catch (error) {
    // https://github.com/enquirer/enquirer/issues/225#issue-516043136
    // Empty string corresponds to the user hitting Ctrl + C
    if (error === "") {
      await quit("", 0);
      return;
    }

    const eventId = Sentry.captureException(error);
    const eventStr = `\n\nError ID: ${output.info(eventId)}`;

    return await quit(
      output.errorText(
        "Something went wrong. Please contact support or try again later."
      ) + eventStr
    );
  }
};

/**
 * Outputs instructions to the user and collects an API token
 * @param message {string | null} The message to display to the user
 * @returns The collected token
 */
async function collectToken(message: string | null) {
  const apiUrl = output.url("https://app.dittowords.com/account/devtools");
  const breadcrumbs = output.bold(output.info("API Keys"));
  const tokenDescription =
    message ||
    `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} under "${breadcrumbs}".`;

  output.write(tokenDescription);

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
 * @param token {string} The token to validate
 * @returns {string} The newly validated token
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
