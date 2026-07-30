import open from "open";

import logger from "../../utils/logger";
import { OAUTH_CLIENT_ID, OAUTH_SCOPES } from "../../utils/constants";
import discoverAuthServer from "./discovery";
import startLoopback from "./loopback";
import { createPKCEPair, createState } from "./pkce";
import { exchangeCodeForToken } from "./tokenRequest";
import { OAuthCredential } from "./types";

/**
 * Authorization code + PKCE against the API's authorization server, with the
 * browser redirected back to a local port.
 *
 * `audience` is Auth0's way of naming the API a token is for; `resource` is the
 * standard spelling of the same thing (RFC 8707). Both are sent because the
 * tenant's resource-parameter handling decides which one it honors.
 */
export default async function browserLogin(): Promise<OAuthCredential> {
  const authServer = await discoverAuthServer();
  const state = createState();
  const { verifier, challenge } = createPKCEPair();
  const loopback = await startLoopback(state);

  try {
    const authorizeUrl = new URL(authServer.authorizationEndpoint);
    authorizeUrl.search = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      response_type: "code",
      redirect_uri: loopback.redirectUri,
      scope: OAUTH_SCOPES,
      audience: authServer.audience,
      resource: authServer.audience,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();

    logger.writeLine(
      `Log in to Ditto to continue. We'll open ${logger.url(
        authorizeUrl.origin
      )} in your browser.`
    );

    // Best effort: the URL is printed either way, so a machine that can't open a
    // browser still leaves the person something to paste.
    await open(authorizeUrl.toString()).catch(() => {});
    logger.writeLine(
      `\nIf your browser didn't open, go to:\n${logger.url(
        authorizeUrl.toString()
      )}\n`
    );

    const code = await loopback.waitForCode();
    return await exchangeCodeForToken({
      tokenEndpoint: authServer.tokenEndpoint,
      code,
      codeVerifier: verifier,
      redirectUri: loopback.redirectUri,
    });
  } finally {
    loopback.close();
  }
}
