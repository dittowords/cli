import axios from "axios";
import http from "http";
import startLoopback from "./loopback";

// Node's default agent pools connections, which would send a request to the
// socket left over from a previous test's now-closed server.
const get = (url: string) =>
  axios.get(url, { httpAgent: new http.Agent({ keepAlive: false }) });

describe("startLoopback", () => {
  it("returns the code when the state matches", async () => {
    const loopback = await startLoopback("expected-state");

    const response = await get(
      `${loopback.redirectUri}?code=the-code&state=expected-state`
    );

    expect(response.status).toBe(200);
    await expect(loopback.waitForCode()).resolves.toBe("the-code");
    loopback.close();
  });

  // Without this check another page open in the browser could hand us a code we
  // never asked for.
  it("refuses a code whose state doesn't match", async () => {
    const loopback = await startLoopback("expected-state");
    // Assert before triggering: the rejection arrives while the request is still
    // in flight, and an unhandled one fails the suite.
    const waiting = expect(loopback.waitForCode()).rejects.toThrow(
      "We couldn't verify your login"
    );

    await get(`${loopback.redirectUri}?code=the-code&state=someone-else`);

    await waiting;
    loopback.close();
  });

  it("surfaces the description when the authorization server sends an error", async () => {
    const loopback = await startLoopback("expected-state");
    const waiting = expect(loopback.waitForCode()).rejects.toThrow(
      "You turned down the request"
    );

    await get(
      `${loopback.redirectUri}?error=access_denied&error_description=You+turned+down+the+request`
    );

    await waiting;
    loopback.close();
  });

  it("ignores requests to any other path", async () => {
    const loopback = await startLoopback("expected-state");

    await expect(
      get(new URL("/favicon.ico", loopback.redirectUri).toString())
    ).rejects.toMatchObject({ response: { status: 404 } });

    loopback.close();
  });
});
