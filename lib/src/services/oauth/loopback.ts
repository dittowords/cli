import http from "http";
import { AddressInfo } from "net";

import {
  OAUTH_CALLBACK_PATH,
  OAUTH_LOGIN_TIMEOUT_MS,
  OAUTH_REDIRECT_PORTS,
} from "../../utils/constants";

const LOGIN_FAILED = "We couldn't verify your login. Log in again.";

const page = (heading: string, body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>Ditto</title></head>` +
  `<body style="font-family:system-ui,sans-serif;padding:3rem;text-align:center">` +
  `<h1 style="font-size:1.25rem">${heading}</h1><p>${body}</p></body></html>`;

function respond(res: http.ServerResponse, heading: string, body: string) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(page(heading, body));
}

async function listenOnFirstFreePort(server: http.Server) {
  for (const port of OAUTH_REDIRECT_PORTS) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.removeListener("error", reject);
          resolve();
        });
      });
      return (server.address() as AddressInfo).port;
    } catch (error: any) {
      if (error?.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error(
    "Ditto needs a free port to finish logging in, but they're all in use. Close what's using them and try again."
  );
}

/**
 * A one-shot local web server that catches the redirect Auth0 sends the browser
 * back to. The `state` it's given must match what comes back, so another page in
 * the browser can't hand us a code we didn't ask for.
 */
export default async function startLoopback(state: string) {
  let resolveCode: (code: string) => void = () => {};
  let rejectCode: (error: Error) => void = () => {};
  const received = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname !== OAUTH_CALLBACK_PATH) {
      res.writeHead(404);
      return res.end();
    }

    // Auth0 often sends `error` with no `error_description`, so the code itself
    // has to make it into the message — it's the only clue about which bit of
    // tenant configuration was refused.
    const failure = url.searchParams.get("error");
    if (failure) {
      const description = url.searchParams.get("error_description");
      respond(res, "Log in again", description || LOGIN_FAILED);
      return rejectCode(
        new Error(
          `The login server refused the request (${failure})${
            description ? `: ${description}` : ""
          }`
        )
      );
    }

    const code = url.searchParams.get("code");
    if (!code) {
      respond(res, "Log in again", LOGIN_FAILED);
      return rejectCode(new Error(LOGIN_FAILED));
    }
    if (url.searchParams.get("state") !== state) {
      respond(res, "Log in again", LOGIN_FAILED);
      return rejectCode(new Error(LOGIN_FAILED));
    }

    respond(
      res,
      "You're logged in",
      "Close this tab to go back to your terminal."
    );
    resolveCode(code);
  });

  const port = await listenOnFirstFreePort(server);

  return {
    redirectUri: `http://localhost:${port}${OAUTH_CALLBACK_PATH}`,
    close: () => server.close(),
    waitForCode: () =>
      Promise.race([
        received,
        new Promise<never>((_, reject) =>
          setTimeout(
            // Distinct from a refusal: a five-minute wait that ends in the same
            // sentence looks identical to being turned down straight away.
            () =>
              reject(
                new Error(
                  "Ditto stopped waiting for the browser. Log in again."
                )
              ),
            OAUTH_LOGIN_TIMEOUT_MS
          ).unref()
        ),
      ]),
  };
}
