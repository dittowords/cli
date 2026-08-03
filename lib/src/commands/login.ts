import open from "open";

import getAuth0Config from "../services/auth/auth0Config";
import { logInThroughBrowser } from "../services/auth/loopbackFlow";
import { bearerHeader, currentHostname } from "../services/auth/session";
import verifyOAuthAccess from "../services/auth/verifyAccess";
import * as configService from "../services/globalConfig";
import appContext from "../utils/appContext";
import logger from "../utils/logger";
import { quit } from "../utils/quit";

/** Logs in through the browser and saves the session. */
export const login = async () => {
  const config = getAuth0Config();

  logger.writeLine(`Logging in to Ditto at ${logger.info(appContext.apiHost)}`);

  // DITTO_TOKEN outranks a saved session, so this login would otherwise look like
  // it took effect and change nothing.
  if (process.env.DITTO_TOKEN) {
    logger.writeLine(
      logger.warnText(
        "DITTO_TOKEN is set, so commands will keep using that API key instead of this login."
      )
    );
  }

  const session = await logInThroughBrowser(config, async (url) => {
    try {
      await open(url);
    } catch {
      // Only worth the terminal space when there's no browser to open it: the
      // authorize URL is long enough to wrap several lines.
      logger.writeLine(
        logger.subtle(
          "\nWe couldn't open your browser. Approve the login here:"
        )
      );
      logger.writeLine(logger.url(url));
    }

    // Nothing prints again until the redirect lands, so say what's happening.
    logger.writeLine(
      logger.subtle("\nWaiting for you to approve this login in your browser.")
    );
  });

  const header = bearerHeader(session.accessToken);

  // Verify before storing, so an audience or tenant mismatch surfaces here rather
  // than on the next command.
  const failure = await verifyOAuthAccess(header);
  if (failure) {
    return await quit(failure.join("\n"));
  }

  configService.saveOAuthSession(
    appContext.configFile,
    currentHostname(),
    session
  );
  appContext.setApiToken(header);

  logger.writeLine(
    logger.success(
      `\nYou're logged in. We saved your session to ${appContext.configFile}\n`
    )
  );
};
