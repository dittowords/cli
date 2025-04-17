import appContext from "../../utils/appContext";
import * as configService from "../globalConfig";
import logger from "../../utils/logger";
import { quit } from "../../utils/quit";
import * as Sentry from "@sentry/node";
import collectToken from "./collectToken";
import getURLHostname from "./getURLHostname";

/**
 * Collects a token from the user and saves it to the global config file
 * @param host The host to save the token for
 * @returns The collected token
 */
export default async function collectAndSaveToken(
  host: string = appContext.apiHost
) {
  try {
    const token = await collectToken();
    logger.writeLine(
      `Thanks for authenticating.  We'll save the key to: ${logger.info(
        appContext.configFile
      )}\n`
    );
    const sanitizedHost = getURLHostname(host);
    configService.saveToken(appContext.configFile, sanitizedHost, token);
    appContext.setApiToken(token);
    return token;
  } catch (error) {
    // https://github.com/enquirer/enquirer/issues/225#issue-516043136
    // Empty string corresponds to the user hitting Ctrl + C
    if (error === "") {
      await quit("", 0);
      return "";
    }

    const eventId = Sentry.captureException(error);
    const eventStr = `\n\nError ID: ${logger.info(eventId)}`;

    await quit(
      logger.errorText(
        "Something went wrong. Please contact support or try again later."
      ) + eventStr
    );
    return "";
  }
}
