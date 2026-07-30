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
        "Ditto needs an API key — a password that lets Ditto reach your workspace. There's no way to type one in here."
      ) +
        `\n\nTo set it up:\n` +
        `  1. Create a key at ${logger.url(apiKeysUrl)}\n` +
        `  2. Run this same command yourself, in a terminal — the app on your computer where you type commands. It'll ask for the key and remember it, so this is a one-time step.\n` +
        `\nSetting Ditto up for automation instead? Save your key as ${logger.info(
          "DITTO_TOKEN"
        )} and Ditto will use that.`
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
