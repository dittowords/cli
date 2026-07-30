import appContext from "../../utils/appContext";
import fs from "fs";
import * as configService from "../globalConfig";
import logger from "../../utils/logger";
import validateToken from "./validateToken";
import getURLHostname from "./getURLHostname";
import initOAuthCredential from "./initOAuthCredential";
import { LoginMethod } from "./promptForLoginMethod";

/**
 * Initializes the credential based on the appContext and config file.
 *
 * An API key wins wherever one turns up — the environment variable first, then
 * the config file — so automation and anyone who already pasted a key keeps the
 * behavior they have today. Only with no key in either place does this fall
 * through to a stored browser login, and then to asking how to log in.
 *
 * @param method Skips asking how to log in, for `--browser` / `--api-key`.
 * @returns The initialized API token, or undefined when the browser login is
 * what authenticated instead (that credential lands on the app context).
 */
export default async function initAPIToken(method?: LoginMethod) {
  logger.debug(
    `resolving a credential for ${appContext.apiHost} (config: ${appContext.configFile})`
  );

  if (appContext.apiToken) {
    // Worth naming loudly: a DITTO_TOKEN that the API rejects ends at the same
    // API key prompt as having no credential at all, without OAuth being tried.
    logger.debug("found an API key in DITTO_TOKEN — OAuth won't be considered");
    return await validateToken(appContext.apiToken);
  }

  if (!fs.existsSync(appContext.configFile)) {
    logger.debug("no config file yet");
    return await initOAuthCredential(undefined, undefined, method);
  }

  const configData = configService.readGlobalConfigData(appContext.configFile);
  const sanitizedHost = getURLHostname(appContext.apiHost);
  const stored = configData[sanitizedHost]?.[0];

  logger.debug(
    `config entry for "${sanitizedHost}": ${
      stored
        ? `key ${stored.token ? "yes" : "no"}, browser login ${
            stored.oauth ? "yes" : "no"
          }`
        : "none"
    } (hosts in file: ${Object.keys(configData).join(", ") || "none"})`
  );

  if (stored?.token) {
    logger.debug("using the API key from the config file");
    return await validateToken(stored.token);
  }

  return await initOAuthCredential(sanitizedHost, stored?.oauth, method);
}
