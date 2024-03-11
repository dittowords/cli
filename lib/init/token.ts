import fs from "fs";

import chalk from "chalk";

import { prompt } from "enquirer";

import { createApiClient } from "../api";
import consts from "../consts";
import output from "../output";
import config from "../config";
import { quit } from "../utils/quit";
import { AxiosError, AxiosResponse } from "axios";

export const needsToken = (configFile?: string, host = consts.API_HOST) => {
  if (config.getTokenFromEnv()) {
    return false;
  }

  const file = configFile || consts.CONFIG_FILE;
  if (!fs.existsSync(file)) return true;
  const configData = config.readGlobalConfigData(file);
  if (
    !configData[config.justTheHost(host)] ||
    configData[config.justTheHost(host)][0].token === ""
  )
    return true;
  return false;
};

async function verifyTokenUsingTokenCheck(
  token: string
): Promise<{ success: true } | { success: false; output: string[] }> {
  const axios = createApiClient(token);
  const endpoint = "/token-check";

  let resOrError: AxiosResponse<any> | undefined;
  try {
    resOrError = await axios.get(endpoint);
  } catch (e: unknown) {
    if (!(e instanceof AxiosError)) {
      return {
        success: false,
        output: [
          output.warnText(
            "Sorry! We're having trouble reaching the Ditto API."
          ),
        ],
      };
    }

    if (e.code === "ENOTFOUND") {
      return {
        success: false,
        output: [
          output.errorText(
            `Can't connect to API: ${output.url(consts.API_HOST)}`
          ),
        ],
      };
    }

    if (e.response?.status === 401 || e.response?.status === 404) {
      return {
        success: false,
        output: [
          output.errorText("This API key isn't valid. Please try another."),
        ],
      };
    }
  }

  if (typeof resOrError === "string") {
    return {
      success: false,
      output: [resOrError],
    };
  }

  if (resOrError?.status === 200) {
    return { success: true };
  }

  return {
    success: false,
    output: [output.errorText("This API key isn't valid. Please try another.")],
  };
}

// Returns true if valid, otherwise an error message.
async function checkToken(token: string): Promise<any> {
  const result = await verifyTokenUsingTokenCheck(token);
  if (!result.success) {
    return result.output.join("\n");
  }

  return true;
}

async function collectToken(message: string | null) {
  const blue = output.info;
  const apiUrl = output.url("https://app.dittowords.com/account/devtools");
  const breadcrumbs = `${chalk.bold(blue("API Keys"))}`;
  const tokenDescription =
    message ||
    `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} under "${breadcrumbs}".`;
  console.log(tokenDescription);

  const response = await prompt<{ token: string }>({
    type: "input",
    name: "token",
    message: "What is your API key?",
    validate: (token) => checkToken(token),
  });
  return response.token;
}

/**
 *
 * @param {string | null} message
 * @returns
 */
export const collectAndSaveToken = async (message: string | null = null) => {
  try {
    const token = await collectToken(message);
    console.log(
      `Thanks for authenticating.  We'll save the key to: ${output.info(
        consts.CONFIG_FILE
      )}`
    );
    output.nl();

    config.saveToken(consts.CONFIG_FILE, consts.API_HOST, token);
    return token;
  } catch (error) {
    quit("API token was not saved");
  }
};

export default { needsToken, collectAndSaveToken };

export const _test = { verifyTokenUsingTokenCheck };
