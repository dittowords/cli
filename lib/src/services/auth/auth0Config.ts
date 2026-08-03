import appContext from "../../utils/appContext";
import DittoError, { ErrorType } from "../../utils/DittoError";
import getURLHostname from "../apiToken/getURLHostname";

export interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
}

const PROD_API_HOSTNAME = "api.dittowords.com";

/**
 * Public identifier information for production instance of Auth0
 */
const PROD: Auth0Config = {
  domain: "ditto-app.auth0.com",
  clientId: "4nJcC64AvZ1JxmBG8NpYAKDHnbTdUH7y",
  audience: "https://api.dittowords.com",
};

/**
 * Gets Auth0 details for the environment that the CLI is pointed at.
 */
export default function getAuth0Config(
  apiHost = appContext.apiHost
): Auth0Config {
  const base = getURLHostname(apiHost) === PROD_API_HOSTNAME ? PROD : undefined;

  const domain = process.env.DITTO_AUTH0_DOMAIN || base?.domain;
  const clientId = process.env.DITTO_AUTH0_CLIENT_ID || base?.clientId;
  const audience = process.env.DITTO_AUTH0_AUDIENCE || base?.audience;

  if (!domain || !clientId || !audience) {
    throw new DittoError({
      type: ErrorType.AuthError,
      expected: true,
      message:
        `Ditto doesn't know how to log in to ${apiHost}. ` +
        `Set DITTO_AUTH0_DOMAIN, DITTO_AUTH0_CLIENT_ID, and DITTO_AUTH0_AUDIENCE, ` +
        `or use an API key instead.`,
      data: { apiHost },
    });
  }

  return { domain, clientId, audience };
}
