import appContext from "../../utils/appContext";
import fs from "fs";
import * as configService from "../globalConfig";
import collectAndSaveToken from "./collectAndSaveToken";
import validateToken from "./validateToken";
import getURLHostname from "./getURLHostname";

/**
 * Initializes the API token
 * @param token The token to initialize the API token with. If not provided, the token will be fetched from the global config file.
 * @param configFile The path to the global config file
 * @param host The host to initialize the API token for
 * @returns The initialized API token
 */
export default async function initAPIToken(
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
