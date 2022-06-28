import fs from "fs";

import chalk from "chalk";

import { prompt } from "enquirer";

import { create } from "../api";
import consts from "../consts";
import output from "../output";
import config from "../config";

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

// Returns true if valid, otherwise an error message.
async function checkToken(token: string): Promise<any> {
  const axios = create(token);
  const endpoint = "/token-check";

  const resOrError = await axios
    .get(endpoint)
    .catch((error: any) => {
      if (error.code === "ENOTFOUND") {
        return output.errorText(
          `Can't connect to API: ${output.url(error.hostname)}`
        );
      }
      if (error.response.status === 401 || error.response.status === 404) {
        return output.errorText(
          "This API key isn't valid. Please try another."
        );
      }
      return output.warnText("We're having trouble reaching the Ditto API.");
    })
    .catch(() =>
      output.errorText("Sorry! We're having trouble reaching the Ditto API.")
    );
  if (typeof resOrError === "string") return resOrError;

  if (resOrError.status === 200) return true;

  return output.errorText("This API key isn't valid. Please try another.");
}

async function collectToken(message: string | null) {
  const blue = output.info;
  const apiUrl = output.url("https://app.dittowords.com/account/user");
  const breadcrumbs = `${blue("User")}`;
  const tokenDescription =
    message ||
    `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} > ${breadcrumbs} under "${chalk.bold(
      "API Keys"
    )}".`;
  console.log(tokenDescription);

  const response = await prompt<{ token: string }>({
    type: "input",
    name: "token",
    message: "What is your API key?",
    validate: (token) => checkToken(token),
  });
  return response.token;
}

function quit(exitCode = 2) {
  console.log("API key was not saved.");
  process.exitCode = exitCode;
  process.exit();
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
    quit();
  }
};

export default { needsToken, collectAndSaveToken };
