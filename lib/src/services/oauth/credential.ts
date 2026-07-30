import appContext from "../../utils/appContext";
import getURLHostname from "../apiToken/getURLHostname";
import * as configService from "../globalConfig";
import discoverAuthServer from "./discovery";
import { refreshAccessToken } from "./tokenRequest";
import { OAuthCredential } from "./types";

// Refresh slightly early so a long pull doesn't have a request expire in flight.
const REFRESH_WINDOW_MS = 60 * 1000;

let refreshInFlight: Promise<OAuthCredential> | null = null;

export const isExpiring = (credential: OAuthCredential) =>
  credential.expiresAt - Date.now() <= REFRESH_WINDOW_MS;

export function persistCredential(credential: OAuthCredential) {
  configService.saveOAuthCredential(
    appContext.configFile,
    getURLHostname(appContext.apiHost),
    credential
  );
  appContext.setOAuthCredential(credential);
}

/**
 * Returns an access token that's good to send, refreshing first when the current
 * one is close to expiring.
 *
 * A pull fans out many requests at once, so the refresh is single-flight — the
 * first caller starts it and the rest wait on the same promise. Refreshing
 * concurrently would burn the refresh token if the tenant rotates them.
 */
export async function getAccessToken(credential: OAuthCredential) {
  if (!isExpiring(credential) || !credential.refreshToken) {
    return credential.accessToken;
  }

  if (!refreshInFlight) {
    const refreshToken = credential.refreshToken;
    refreshInFlight = discoverAuthServer()
      .then(({ tokenEndpoint }) =>
        refreshAccessToken({ tokenEndpoint, refreshToken })
      )
      .then((refreshed) => {
        persistCredential(refreshed);
        return refreshed;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  const refreshed = await refreshInFlight;
  return refreshed.accessToken;
}
