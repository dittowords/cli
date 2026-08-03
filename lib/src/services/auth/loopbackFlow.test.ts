import axios from "axios";
import crypto from "crypto";
import http from "http";
import { logInThroughBrowser, refreshSession } from "./loopbackFlow";

jest.mock("axios");

const config = {
  domain: "tenant.auth0.com",
  clientId: "client",
  audience: "https://audience",
};

const post = () => axios.post as jest.Mock;

// `restoreMocks` doesn't clear a module automock, so call history would leak.
beforeEach(() => post().mockReset());

const tokenResponse = (data: Record<string, unknown> = {}) => ({
  status: 200,
  data: { access_token: "at", refresh_token: "rt", expires_in: 3600, ...data },
});

/** Stands in for the browser: follows the authorize URL's redirect_uri back. */
const visitCallback = (authorizeUrl: string, query: Record<string, string>) => {
  const params = new URL(authorizeUrl).searchParams;
  const callback = new URL(params.get("redirect_uri")!);
  for (const [key, value] of Object.entries(query)) {
    callback.searchParams.set(key, value);
  }
  return new Promise<void>((resolve, reject) => {
    http
      .get(callback.toString(), (res) => {
        res.resume();
        res.on("end", resolve);
      })
      .on("error", reject);
  });
};

/** Approves the login the way Auth0 would, echoing the state back. */
const approve = (authorizeUrl: string) =>
  visitCallback(authorizeUrl, {
    code: "auth-code",
    state: new URL(authorizeUrl).searchParams.get("state")!,
  });

describe("logInThroughBrowser", () => {
  it("exchanges the code the browser is redirected back with", async () => {
    post().mockResolvedValueOnce(tokenResponse());

    const session = await logInThroughBrowser(config, approve);

    expect(session.accessToken).toBe("at");
    expect(session.refreshToken).toBe("rt");
    expect(session.expiresAt).toBeGreaterThan(Date.now());

    const [, body] = post().mock.calls[0];
    expect(body.grant_type).toBe("authorization_code");
    expect(body.code).toBe("auth-code");
  });

  // PKCE stands in for the client secret, so a mismatch here means Auth0 would
  // reject every exchange.
  it("sends a verifier that matches the S256 challenge it asked with", async () => {
    post().mockResolvedValueOnce(tokenResponse());
    let challenge: string | null = null;

    await logInThroughBrowser(config, (url) => {
      const params = new URL(url).searchParams;
      challenge = params.get("code_challenge");
      expect(params.get("code_challenge_method")).toBe("S256");
      return approve(url);
    });

    const [, body] = post().mock.calls[0];
    const expected = crypto
      .createHash("sha256")
      .update(body.code_verifier)
      .digest("base64url");
    expect(challenge).toBe(expected);
  });

  it("redirects back to a loopback address", async () => {
    post().mockResolvedValueOnce(tokenResponse());
    let redirectUri: string | null = null;

    await logInThroughBrowser(config, (url) => {
      redirectUri = new URL(url).searchParams.get("redirect_uri");
      return approve(url);
    });

    expect(redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
  });

  // Without this check another site could hand us a code of its choosing.
  it("refuses a response whose state doesn't match the request", async () => {
    await expect(
      logInThroughBrowser(config, (url) =>
        visitCallback(url, { code: "auth-code", state: "not-the-state" })
      )
    ).rejects.toThrow(/didn't match/i);

    expect(post()).not.toHaveBeenCalled();
  });

  it("surfaces Auth0's description when the user denies the login", async () => {
    await expect(
      logInThroughBrowser(config, (url) =>
        visitCallback(url, {
          error: "access_denied",
          error_description: "User did not authorize",
        })
      )
    ).rejects.toThrow(/User did not authorize/);
  });

  it("surfaces Auth0's description when the code exchange fails", async () => {
    post().mockResolvedValueOnce({
      status: 403,
      data: { error: "invalid_grant", error_description: "Code expired" },
    });

    await expect(logInThroughBrowser(config, approve)).rejects.toThrow(
      /Code expired/
    );
  });

  /**
   * `server.close()` waits on keep-alive sockets, and clients ask for those by
   * default — so without the `Connection: close` response header the process hangs
   * and the port stays bound. Asserting the same port twice is what proves it was
   * released, since otherwise the flow just falls through to the next one.
   */
  it("releases the port when it's done", async () => {
    post()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(tokenResponse());
    const ports: string[] = [];
    const record = (url: string) => {
      ports.push(new URL(new URL(url).searchParams.get("redirect_uri")!).port);
      return approve(url);
    };

    await logInThroughBrowser(config, record);
    await logInThroughBrowser(config, record);

    expect(ports[0]).toBe(ports[1]);
  });
});

describe("refreshSession", () => {
  it("keeps the existing refresh token when rotation doesn't return a new one", async () => {
    post().mockResolvedValueOnce(tokenResponse({ refresh_token: undefined }));

    expect(await refreshSession(config, "original-rt")).toMatchObject({
      accessToken: "at",
      refreshToken: "original-rt",
    });
  });

  it("stores the rotated refresh token when Auth0 returns one", async () => {
    post().mockResolvedValueOnce(
      tokenResponse({ refresh_token: "rotated-rt" })
    );

    expect(await refreshSession(config, "original-rt")).toMatchObject({
      refreshToken: "rotated-rt",
    });
  });

  // A NaN expiresAt fails the config schema on the next read, and a schema miss
  // there reads as an empty config — losing every host's credential.
  it("still produces a usable expiry when expires_in is missing", async () => {
    post().mockResolvedValueOnce(tokenResponse({ expires_in: undefined }));

    const session = await refreshSession(config, "original-rt");

    expect(session?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("returns null when the refresh token is rejected", async () => {
    post().mockResolvedValueOnce({
      status: 403,
      data: { error: "invalid_grant" },
    });

    expect(await refreshSession(config, "spent-rt")).toBeNull();
  });
});
