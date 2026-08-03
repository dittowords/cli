import { currentHostname } from "../services/auth/session";
import * as configService from "../services/globalConfig";
import appContext from "../utils/appContext";
import logger from "../utils/logger";

/** Forgets the local session. Doesn't revoke it at Auth0. */
export const logout = async () => {
  const hostname = currentHostname();

  if (!configService.readCredential(appContext.configFile, hostname)?.oauth) {
    logger.writeLine(
      `You're not logged in to Ditto at ${logger.info(appContext.apiHost)}`
    );
    return;
  }

  configService.clearCredential(appContext.configFile, hostname);
  logger.writeLine(logger.success("You're logged out."));

  // Otherwise "You're logged out" is a lie — the env token still authenticates.
  if (process.env.DITTO_TOKEN) {
    logger.writeLine(
      logger.warnText(
        "DITTO_TOKEN is still set, so commands will keep using that API key."
      )
    );
  }
};
