import initAPIToken from "../services/apiToken/initAPIToken";
import { LoginMethod } from "../services/apiToken/promptForLoginMethod";
import appContext from "../utils/appContext";
import logger from "../utils/logger";
import { quit } from "../utils/quit";

/**
 * Saves a credential and does nothing else, so it can be handed to someone who
 * only needs to get authenticated — pull and scan both have side effects
 * (project config, file writes, uploading a scan) that would surprise them.
 */
export const login = async (method?: LoginMethod) => {
  const token = await initAPIToken(method);

  // A browser login returns no token; the credential is on the app context.
  const loggedInWithBrowser = !token && !!appContext.oauthCredential;

  // collectToken exits on its own when there's no terminal to prompt in.
  if (!token && !loggedInWithBrowser) return;

  // Both are undefined after a browser login, and undefined === undefined would
  // otherwise claim the key came from the environment.
  const usingEnvironmentVariable = !!token && token === process.env.DITTO_TOKEN;

  logger.writeLine(
    logger.success("\nYou're all set — Ditto can reach your workspace.") +
      (usingEnvironmentVariable
        ? `\nUsing the key in ${logger.info("DITTO_TOKEN")}.`
        : `\nYour ${
            loggedInWithBrowser ? "login" : "key"
          } is saved in ${logger.info(appContext.configFile)}.`)
  );

  await quit(null, 0);
};
