import appContext from "../../utils/appContext";
import fs from "fs";
import * as configService from "../globalConfig";
import validateToken from "./validateToken";
import getURLHostname from "./getURLHostname";
import initOAuthCredential from "./initOAuthCredential";

/**
 * Initializes the credential based on the appContext and config file.
 *
 * An API key wins wherever one turns up — the environment variable first, then
 * the config file — so automation and anyone who already pasted a key keeps the
 * behavior they have today. Only with no key in either place does this fall
 * through to a stored browser login, and then to logging in through the browser.
 *
 * @returns The initialized API token, or undefined when the browser login is
 * what authenticated instead (that credential lands on the app context).
 */
export default async function initAPIToken() {
  if (appContext.apiToken) {
    return await validateToken(appContext.apiToken);
  }

  if (!fs.existsSync(appContext.configFile)) {
    return await initOAuthCredential();
  }

  const configData = configService.readGlobalConfigData(appContext.configFile);
  const sanitizedHost = getURLHostname(appContext.apiHost);
  const stored = configData[sanitizedHost]?.[0];

  if (stored?.token) {
    return await validateToken(stored.token);
  }

  return await initOAuthCredential(sanitizedHost, stored?.oauth);
}
