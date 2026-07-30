import axios from "axios";

import { OAUTH_CLIENT_ID } from "../../utils/constants";
import { OAuthCredential } from "./types";

// Auth0 reports lifetime as a duration; store an absolute instant so a
// credential read back from disk on a later run is still interpretable.
const toCredential = (data: any, fallbackRefreshToken?: string) => ({
  accessToken: data.access_token,
  refreshToken: data.refresh_token || fallbackRefreshToken,
  expiresAt: Date.now() + Number(data.expires_in) * 1000,
});

async function post(tokenEndpoint: string, params: Record<string, string>) {
  const { data } = await axios.post(
    tokenEndpoint,
    new URLSearchParams({ client_id: OAUTH_CLIENT_ID, ...params }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data;
}

export async function exchangeCodeForToken(args: {
  tokenEndpoint: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OAuthCredential> {
  const data = await post(args.tokenEndpoint, {
    grant_type: "authorization_code",
    code: args.code,
    code_verifier: args.codeVerifier,
    redirect_uri: args.redirectUri,
  });
  return toCredential(data);
}

export async function refreshAccessToken(args: {
  tokenEndpoint: string;
  refreshToken: string;
}): Promise<OAuthCredential> {
  const data = await post(args.tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  });
  // Auth0 only returns a new refresh token when rotation is on; keep the existing
  // one otherwise, or the next refresh has nothing to present.
  return toCredential(data, args.refreshToken);
}
