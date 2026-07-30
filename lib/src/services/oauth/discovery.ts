import axios from "axios";

import appContext from "../../utils/appContext";

export interface AuthServer {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  /**
   * The API identifier Auth0 mints the token for. Comes from the API rather than
   * a constant here, so pointing the CLI at another environment — or splitting
   * the public API onto its own Auth0 API later — needs no CLI release.
   */
  audience: string;
}

/**
 * Asks the API who authorizes it (RFC 9728), then asks that authorization server
 * for its endpoints (OpenID discovery).
 */
export default async function discoverAuthServer(): Promise<AuthServer> {
  const { data: resource } = await axios.get(
    `${appContext.apiHost}/.well-known/oauth-protected-resource`
  );

  const issuer = resource?.authorization_servers?.[0];
  if (!issuer || !resource?.resource) {
    throw new Error(
      "This Ditto API doesn't support logging in through a browser."
    );
  }

  const { data: metadata } = await axios.get(
    new URL("/.well-known/openid-configuration", issuer).toString()
  );

  if (!metadata?.authorization_endpoint || !metadata?.token_endpoint) {
    throw new Error(
      "This Ditto API doesn't support logging in through a browser."
    );
  }

  return {
    authorizationEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
    audience: resource.resource,
  };
}
