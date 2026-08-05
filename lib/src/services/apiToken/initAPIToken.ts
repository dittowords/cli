import appContext from "../../utils/appContext";
import DittoError, { ErrorType } from "../../utils/DittoError";
import * as configService from "../globalConfig";
import { resolveOAuthHeader } from "../auth/session";
import collectAndSaveToken from "./collectAndSaveToken";
import validateToken from "./validateToken";
import getURLHostname from "./getURLHostname";

/**
 * The credential every command uses, in precedence order: `DITTO_TOKEN`, a
 * saved OAuth session, a saved API key, then an interactive prompt. `DITTO_TOKEN`
 * stays first so CI works without a browser.
 *
 * @returns The Authorization header value to send
 */
export default async function initAPIToken() {
  if (appContext.authToken) {
    return await validateToken(appContext.authToken);
  }

  // Before any file-existence check: reading the config creates it, and bailing on
  // a missing file would skip login entirely for first-time users.
  const oauthHeader = await resolveOAuthHeader();
  if (oauthHeader) return oauthHeader;

  const sanitizedHost = getURLHostname(appContext.apiHost);
  const credential = configService.readCredential(
    appContext.configFile,
    sanitizedHost
  );

  if (!credential?.token) {
    // A stored session resolveOAuthHeader didn't return is expired past renewal.
    if (credential?.oauth) {
      throw new DittoError({
        type: ErrorType.AuthError,
        expected: true,
        message:
          "Your Ditto session has expired. Run `ditto login` to log in again.",
        data: {},
      });
    }

    return await collectAndSaveToken(sanitizedHost);
  }

  return await validateToken(credential.token);
}
