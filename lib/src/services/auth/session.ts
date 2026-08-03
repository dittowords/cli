import appContext from "../../utils/appContext";
import getURLHostname from "../apiToken/getURLHostname";
import * as configService from "../globalConfig";
import getAuth0Config from "./auth0Config";
import { refreshSession } from "./loopbackFlow";

// The scheme is stored with the credential so the request interceptor stays a
// passthrough: OAuth tokens go out as Bearer, API keys verbatim.
export const bearerHeader = (accessToken: string) => `Bearer ${accessToken}`;

/** The key credentials are filed under. Login, logout, and resolve must agree. */
export const currentHostname = () => getURLHostname(appContext.apiHost);

/**
 * Authorization header for the saved session, renewing it first if expired. Null
 * when there's no session or the refresh token is spent.
 */
export async function resolveOAuthHeader(): Promise<string | null> {
  const hostname = currentHostname();
  const session = configService.readCredential(
    appContext.configFile,
    hostname
  )?.oauth;
  if (!session) return null;

  if (session.expiresAt > Date.now()) return bearerHeader(session.accessToken);
  if (!session.refreshToken) return null;

  const renewed = await refreshSession(getAuth0Config(), session.refreshToken);
  if (!renewed) return null;

  configService.saveOAuthSession(appContext.configFile, hostname, renewed);
  return bearerHeader(renewed.accessToken);
}
