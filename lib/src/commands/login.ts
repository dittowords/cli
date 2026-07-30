import initAPIToken from "../services/apiToken/initAPIToken";
import appContext from "../utils/appContext";
import logger from "../utils/logger";
import { quit } from "../utils/quit";

/**
 * Saves an API key and does nothing else, so it can be handed to someone who
 * only needs to get authenticated — pull and scan both have side effects
 * (project config, file writes, uploading a scan) that would surprise them.
 */
export const login = async () => {
  const token = await initAPIToken();

  // collectToken exits on its own when there's no terminal to prompt in.
  if (!token) return;

  const usingEnvironmentVariable = token === process.env.DITTO_TOKEN;

  logger.writeLine(
    logger.success("\nYou're all set — Ditto can reach your workspace.") +
      (usingEnvironmentVariable
        ? `\nUsing the key in ${logger.info("DITTO_TOKEN")}.`
        : `\nYour key is saved in ${logger.info(appContext.configFile)}.`)
  );

  await quit(null, 0);
};
