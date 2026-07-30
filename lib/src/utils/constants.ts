export const BASE_VARIANT_ID = "base";

/**
 * Registered in Auth0 as a Native application: PKCE, no client secret, loopback
 * redirect. Empty until that app exists — every OAuth path checks
 * `isOAuthConfigured` first and falls back to an API key, so an unset client id
 * degrades to today's behavior instead of a half-working browser flow.
 */
export const OAUTH_CLIENT_ID = process.env.DITTO_OAUTH_CLIENT_ID || "";

export const isOAuthConfigured = () => OAUTH_CLIENT_ID !== "";

/**
 * `offline_access` is what earns a refresh token, so a pull hours after logging
 * in doesn't need another trip through the browser. `mcp:access` is the scope on
 * the Auth0 API whose identifier the public API validates tokens against.
 */
export const OAUTH_SCOPES = "openid profile email offline_access mcp:access";

/**
 * Auth0 matches redirect URIs exactly and has no port wildcard, so these are
 * fixed and all three need registering as callback URLs on the native app. More
 * than one because a developer machine can have the first port already taken.
 */
export const OAUTH_REDIRECT_PORTS = [8976, 8977, 8978];

export const OAUTH_CALLBACK_PATH = "/callback";

// Long enough to find the browser window and type a password, short enough that
// a forgotten terminal doesn't hang forever.
export const OAUTH_LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
