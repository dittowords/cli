import getHttpClient from "../../http/client";
import appContext from "../../utils/appContext";
import logger from "../../utils/logger";

/**
 * Confirms an access token works against the API. Separate from `checkToken`
 * because each failure here has a different fix, and its "invalid API key" wording
 * is wrong when nobody pasted a key.
 *
 * @returns lines to show the user, or null when the token works
 */
export default async function verifyOAuthAccess(
  authorization: string
): Promise<string[] | null> {
  let status: number;
  let body = "";

  try {
    const response = await getHttpClient({ token: authorization }).get(
      "/token-check",
      { validateStatus: () => true }
    );
    status = response.status;
    body = typeof response.data === "string" ? response.data.trim() : "";
  } catch {
    return [
      logger.errorText(
        `We couldn't reach the Ditto API at ${appContext.apiHost}.`
      ),
    ];
  }

  if (status === 200) return null;

  // The API explains refusals in the body (e.g.: Developer Integrations disabled)
  if (body) return [logger.errorText(body)];

  if (status === 401) {
    return [
      logger.errorText("Ditto didn't accept this login."),
      logger.subtle(
        `The API turned down the access token (401). It may expect a different audience than this login asked for.`
      ),
    ];
  }

  if (status === 403) {
    return [
      logger.errorText("This account can't access a workspace on this API."),
      logger.subtle(
        "Sign in to Ditto in your browser once with the same account, then try again."
      ),
    ];
  }

  return [
    logger.errorText("Ditto couldn't verify this login."),
    logger.subtle(`The API answered ${status}.`),
  ];
}
