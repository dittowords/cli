import * as Sentry from "@sentry/node";

import checkToken from "../../http/checkToken";
import appContext from "../../utils/appContext";
import { isOAuthConfigured } from "../../utils/constants";
import logger from "../../utils/logger";
import browserLogin from "../oauth/browserLogin";
import { persistCredential } from "../oauth/credential";
import { OAuthCredential } from "../oauth/types";
import collectAndSaveToken from "./collectAndSaveToken";
import promptForLoginMethod, { LoginMethod } from "./promptForLoginMethod";

const LOGIN_EXPIRED = "We couldn't verify your login. Log in again.";

/**
 * Reached only when no API key was found. Uses a stored browser login when
 * there's a working one; otherwise asks how to authenticate — unless the choice
 * arrived with the command — and falls back to asking for an API key whenever
 * the browser isn't an option.
 *
 * @returns undefined when authenticated through the browser, or the collected
 * API key when it fell back to asking for one.
 */
export default async function initOAuthCredential(
  host?: string,
  stored?: OAuthCredential,
  method?: LoginMethod
) {
  logger.debug(
    `no API key found; stored browser login: ${
      stored ? "yes" : "no"
    }, terminal: ${process.stdin.isTTY ? "yes" : "no"}, OAuth configured: ${
      isOAuthConfigured() ? "yes" : "no"
    }, method: ${method ?? "not specified"}`
  );

  if (stored) {
    appContext.setOAuthCredential(stored);
    // Sends the stored credential — refreshing it first if it's stale — so an
    // expired login is caught here rather than midway through a pull.
    const response = await checkToken(undefined, LOGIN_EXPIRED);
    if (response.success) return undefined;

    appContext.setOAuthCredential(undefined);
    response.output?.forEach((line) => logger.writeLine(line));
  }

  // Nobody to ask, so don't offer a choice or open a browser that would sit
  // waiting: collectToken explains how to set a key up instead.
  if (!process.stdin.isTTY) {
    logger.debug("no terminal to ask in — asking for an API key instead");
    return await collectAndSaveToken(host);
  }

  if (!isOAuthConfigured()) {
    // Only reachable before the Auth0 application exists. Say it plainly rather
    // than silently ignoring an explicit --browser.
    if (method === "browser") {
      logger.writeLine(
        logger.warnText(
          "This version of Ditto can't log in through a browser yet. Use an API key instead."
        )
      );
    }
    return await collectAndSaveToken(host);
  }

  const chosen = method ?? (await promptForLoginMethod());
  logger.debug(`logging in with: ${chosen}`);
  if (chosen === "apiKey") {
    return await collectAndSaveToken(host);
  }

  try {
    persistCredential(await browserLogin());
    return undefined;
  } catch (error) {
    logger.debug(`browser login threw: ${error}`);
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
