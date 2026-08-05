import getAuth0Config from "../services/auth/auth0Config";
import { revokeRefreshToken } from "../services/auth/loopbackFlow";
import { currentHostname } from "../services/auth/session";
import * as configService from "../services/globalConfig";
import appContext from "../utils/appContext";
import logger from "../utils/logger";

/** Forgets the local session and revokes its refresh token at Auth0. */
export const logout = async () => {
  const hostname = currentHostname();
  const session = configService.readCredential(
    appContext.configFile,
    hostname
  )?.oauth;

  if (!session) {
    logger.writeLine(
      `You're not logged in to Ditto at ${logger.info(appContext.apiHost)}`
    );
    return;
  }

  // Before clearing, so a failure here can't leave a live token with nothing left
  // on disk to revoke it with.
  if (session.refreshToken) {
    await revokeRefreshToken(getAuth0Config(), session.refreshToken);
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
