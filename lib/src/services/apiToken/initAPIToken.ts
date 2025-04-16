import appContext from "../../utils/appContext";
import fs from "fs";
import * as configService from "../globalConfig";
import collectAndSaveToken from "./collectAndSaveToken";
import validateToken from "./validateToken";
import getURLHostname from "./getURLHostname";

/**
 * Initializes the API token based on the appContext and config file.
 * @returns The initialized API token
 */
export default async function initAPIToken() {
  if (appContext.apiToken) {
    return await validateToken(appContext.apiToken);
  }

  if (!fs.existsSync(appContext.configFile)) {
    return await collectAndSaveToken();
  }

  const configData = configService.readGlobalConfigData(appContext.configFile);
  const sanitizedHost = getURLHostname(appContext.apiHost);

  if (
    !configData[sanitizedHost] ||
    !configData[sanitizedHost][0] ||
    configData[sanitizedHost][0].token === ""
  ) {
    return await collectAndSaveToken(sanitizedHost);
  }

  return await validateToken(configData[sanitizedHost][0].token);
}
