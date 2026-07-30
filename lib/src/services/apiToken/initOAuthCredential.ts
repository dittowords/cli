import * as Sentry from "@sentry/node";

import checkToken from "../../http/checkToken";
import appContext from "../../utils/appContext";
import { isOAuthConfigured } from "../../utils/constants";
import logger from "../../utils/logger";
import browserLogin from "../oauth/browserLogin";
import { persistCredential } from "../oauth/credential";
import { OAuthCredential } from "../oauth/types";
import collectAndSaveToken from "./collectAndSaveToken";

const LOGIN_EXPIRED = "We couldn't verify your login. Log in again.";

/**
 * Reached only when no API key was found. Uses a stored browser login when
 * there's a working one, otherwise logs in through the browser, and falls back to
 * asking for an API key whenever the browser isn't an option — no client id
 * configured, or nothing on the other end of the terminal to log in with.
 *
 * @returns undefined when authenticated through the browser, or the collected
 * API key when it fell back to asking for one.
 */
export default async function initOAuthCredential(
  host?: string,
  stored?: OAuthCredential
) {
  if (stored) {
    appContext.setOAuthCredential(stored);
    // Sends the stored credential — refreshing it first if it's stale — so an
    // expired login is caught here rather than midway through a pull.
    const response = await checkToken(undefined, LOGIN_EXPIRED);
    if (response.success) return undefined;

    appContext.setOAuthCredential(undefined);
    response.output?.forEach((line) => logger.writeLine(line));
  }

  if (!isOAuthConfigured() || !process.stdin.isTTY) {
    return await collectAndSaveToken(host);
  }

  try {
    persistCredential(await browserLogin());
    return undefined;
  } catch (error) {
    // A browser login can fail for reasons the person can't act on — a tenant
    // misconfiguration, no network. Say so, then offer the path that always
    // works instead of stopping the command.
    Sentry.captureException(error);
    logger.writeLine(
      logger.errorText(
        error instanceof Error && error.message ? error.message : LOGIN_EXPIRED
      )
    );
    return await collectAndSaveToken(host);
  }
}
