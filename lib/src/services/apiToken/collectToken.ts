import open from "open";

import appContext from "../../utils/appContext";
import logger from "../../utils/logger";
import { quit } from "../../utils/quit";
import promptForApiToken from "./promptForApiToken";

/**
 * Outputs instructions to the user and collects an API token
 * @returns The collected token
 */
export default async function collectToken() {
  const apiKeysUrl = `${appContext.appHost}/developers/api-keys`;

  // Every command needing a token funnels through here, so this is the one place
  // that has to cope with nobody being there to ask: run from an agent's tool
  // call, enquirer has no TTY and waits forever. Stopping also keeps the key out
  // of the agent's transcript, because the person types it somewhere else.
  if (!process.stdin.isTTY) {
    await quit(
      logger.warnText(
        "Ditto needs an API key, and there's no terminal here to type it into."
      ) +
        `\n\nCreate a key at ${logger.url(
          apiKeysUrl
        )}, then run this command again in your own terminal — or set ${logger.info(
          "DITTO_TOKEN"
        )} in your environment.`
    );
    return "";
  }

  logger.writeLine(
    `To get started, you'll need your Ditto API key. We'll open ${logger.url(
      apiKeysUrl
    )} so you can create one.`
  );

  // Best effort: the URL is already on screen if the browser won't open.
  await open(apiKeysUrl).catch(() => {});

  const response = await promptForApiToken();
  return response.token;
}
