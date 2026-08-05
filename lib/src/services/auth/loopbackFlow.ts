import axios from "axios";
import crypto from "crypto";
import http from "http";

import DittoError, { ErrorType } from "../../utils/DittoError";
import { Auth0Config } from "./auth0Config";

export interface OAuthSession {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
}

// `offline_access` is how we get the refresh token.
const SCOPE = "openid profile email offline_access";

// Expire a minute early so a token can't lapse mid-request.
const EXPIRY_MARGIN_SECONDS = 60;

// A missing `expires_in` would make `expiresAt` NaN, which fails the config schema
// on the next read — and a schema miss there drops every saved credential.
const DEFAULT_EXPIRY_SECONDS = 3600;

// Ports registered as an allowed callback URL in Auth0.
const PORTS = [51004, 51005, 51006];

const CALLBACK_PATH = "/callback";

// Don't leave a listening server behind if the browser never comes back.
const TIMEOUT_MS = 5 * 60 * 1000;

const DONE_HTML = `<!doctype html><meta charset="utf-8"><title>Ditto CLI</title>
<body style="font-family:system-ui;padding:2rem">
<p>You're logged in. You can close this tab and return to your terminal.</p>
</body>`;

const authError = (message: string) =>
  new DittoError({
    type: ErrorType.AuthError,
    expected: true,
    message,
    data: {},
  });

// Auth0 describes failures in the body, so read it instead of throwing.
const post = (url: string, body: Record<string, string>) =>
  axios.post(url, body, { validateStatus: () => true });

const describe = (data: any) =>
  data?.error_description || data?.error || "unexpected response";

// A 200 with no `access_token` would otherwise be saved as a session that fails
// every request, with nothing pointing back at the login.
const toSession = (data: any): OAuthSession => {
  if (!data?.access_token || typeof data.access_token !== "string") {
    throw authError(
      "We couldn't finish the login. The response didn't include an access token."
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:
      Date.now() +
      ((data.expires_in ?? DEFAULT_EXPIRY_SECONDS) - EXPIRY_MARGIN_SECONDS) *
        1000,
  };
};

const base64url = (bytes: Buffer) => bytes.toString("base64url");

// Creates the Proof Key for Code Exchange (PKCE) challenge + verifier.
// PKCE stands in for a client secret, which a published CLI can't keep.
const createPkce = () => {
  const verifier = base64url(crypto.randomBytes(32));
  return {
    verifier,
    challenge: base64url(crypto.createHash("sha256").update(verifier).digest()),
  };
};

/** Binds the first free port. Nothing to close on failure — it never listened. */
async function listen() {
  for (const port of PORTS) {
    const server = http.createServer();
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.removeAllListeners("error");
          resolve();
        });
      });
      return { server, port };
    } catch {
      // In use; try the next one.
    }
  }

  throw authError(
    `Ditto couldn't open a port to finish the login. Ports ${PORTS.join(
      ", "
    )} are all in use.`
  );
}

/** Resolves with the authorization code the browser is redirected back with. */
function awaitCode(server: http.Server, state: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          authError("The login timed out. Run `ditto login` to try again.")
        ),
      TIMEOUT_MS
    );

    server.on("request", (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404).end();
        return;
      }

      // Answer before settling, so the tab shows something either way. Closing the
      // connection matters: `server.close()` waits on keep-alive sockets, and
      // clients default to keeping them open.
      res
        .writeHead(200, { "Content-Type": "text/html", Connection: "close" })
        .end(DONE_HTML);
      clearTimeout(timer);

      const params = url.searchParams;
      const code = params.get("code");

      if (params.get("error")) {
        return reject(
          authError(
            `We couldn't finish the login. ${describe({
              error: params.get("error"),
              error_description: params.get("error_description"),
            })}`
          )
        );
      }
      // Rejecting a mismatch is what stops another site from feeding us a code.
      if (params.get("state") !== state) {
        return reject(
          authError("The login response didn't match this request.")
        );
      }
      if (!code) {
        return reject(authError("The login response didn't include a code."));
      }

      resolve(code);
    });
  });
}

const authorizeUrl = (
  config: Auth0Config,
  params: { redirectUri: string; challenge: string; state: string }
) =>
  `https://${config.domain}/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    audience: config.audience,
    scope: SCOPE,
    redirect_uri: params.redirectUri,
    state: params.state,
    code_challenge: params.challenge,
    code_challenge_method: "S256",
  })}`;

/**
 * Logs in with the Authorization Code Flow and PKCE, catching Auth0's redirect on
 * a loopback server so there's no code for the user to copy.
 *
 * `showUrl` is where the caller prints and opens the URL; this module has no
 * terminal or browser I/O.
 */
export async function logInThroughBrowser(
  config: Auth0Config,
  showUrl: (url: string) => void | Promise<void>
): Promise<OAuthSession> {
  const { verifier, challenge } = createPkce();
  const state = base64url(crypto.randomBytes(16));
  const { server, port } = await listen();
  const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`;

  try {
    // Listening starts before the browser opens, so a fast redirect can't be
    // missed. Both settle together because the redirect can land while `showUrl` is
    // still running, and a rejection nothing is attached to is an unhandled one.
    const [code] = await Promise.all([
      awaitCode(server, state),
      showUrl(authorizeUrl(config, { redirectUri, challenge, state })),
    ]);

    const response = await post(`https://${config.domain}/oauth/token`, {
      grant_type: "authorization_code",
      client_id: config.clientId,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    });

    if (response.status !== 200) {
      throw authError(
        `We couldn't finish the login. ${describe(response.data)}`
      );
    }

    return toSession(response.data);
  } finally {
    server.close();
  }
}

/**
 * Trades a refresh token for a fresh access token. Null means the refresh token is
 * spent and the user has to log in again.
 */
export async function refreshSession(
  config: Auth0Config,
  refreshToken: string
): Promise<OAuthSession | null> {
  const response = await post(`https://${config.domain}/oauth/token`, {
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  });

  if (response.status !== 200) return null;

  try {
    return {
      ...toSession(response.data),
      // Rotation returns a new refresh token; keep the current one if it doesn't.
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch {
    // A malformed renewal is a failed renewal. Throwing here would surface as a
    // login error mid-`pull`, where "run `ditto login`" is the useful answer.
    return null;
  }
}

/**
 * Kills a refresh token at Auth0 so a copy of the config file can't be replayed
 * after logout. Best-effort: the local credential is gone either way, and logout
 * shouldn't fail because the network did.
 */
export async function revokeRefreshToken(
  config: Auth0Config,
  refreshToken: string
): Promise<void> {
  try {
    await post(`https://${config.domain}/oauth/revoke`, {
      client_id: config.clientId,
      token: refreshToken,
    });
  } catch {
    // Ignore.
  }
}
