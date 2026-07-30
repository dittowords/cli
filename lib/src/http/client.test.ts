import { defaultInterceptor } from "./client";
import appContext from "../utils/appContext";
import { InternalAxiosRequestConfig } from "axios";

describe("defaultInterceptor", () => {
  const HOST = "https://api.example.com";
  const CLIENT_ID = "test-client-id";
  const API_TOKEN = "test-token";
  const INTERCEPTOR_CONFIG = { headers: {} } as InternalAxiosRequestConfig;

  beforeEach(() => {
    appContext.apiHost = HOST;
    appContext.setClientId(CLIENT_ID);
    appContext.setApiToken(API_TOKEN);
  });

  it("sets baseURL to appContext.apiHost", async () => {
    appContext.apiHost = HOST;

    const interceptor = defaultInterceptor();
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.baseURL).toBe(HOST);
  });

  it("sets x-ditto-client-id to appContext.clientId", async () => {
    appContext.setClientId(CLIENT_ID);

    const interceptor = defaultInterceptor();
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-client-id"]).toBe(CLIENT_ID);
  });

  it("sets Authorization header to appContext.apiToken when no token is provided", async () => {
    const interceptor = defaultInterceptor();
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers.Authorization).toBe(API_TOKEN);
  });

  it("sets Authorization header to provided token", async () => {
    const CUSTOM_TOKEN = "custom-token";

    const interceptor = defaultInterceptor({ token: CUSTOM_TOKEN });
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers.Authorization).toBe(CUSTOM_TOKEN);
  });

  // The scheme is how the API tells an OAuth access token from an API key, so a
  // bare access token would be looked up as a key and rejected.
  it("sends an OAuth access token with the Bearer scheme", async () => {
    appContext.setApiToken(undefined);
    appContext.setOAuthCredential({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    const result = await defaultInterceptor()(INTERCEPTOR_CONFIG);

    expect(result.headers.Authorization).toBe("Bearer access-token");
    appContext.setOAuthCredential(undefined);
  });

  it("prefers an explicitly provided token over a stored OAuth credential", async () => {
    appContext.setOAuthCredential({
      accessToken: "access-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    const result = await defaultInterceptor({ token: "explicit-token" })(
      INTERCEPTOR_CONFIG
    );

    expect(result.headers.Authorization).toBe("explicit-token");
    appContext.setOAuthCredential(undefined);
  });

  it("sets x-ditto-app to github_action when githubActionRequest is true", async () => {
    const interceptor = defaultInterceptor({
      meta: { githubActionRequest: "true" },
    });
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-app"]).toBe("github_action");
  });

  it("sets x-ditto-app to cli when githubActionRequest is false", async () => {
    const interceptor = defaultInterceptor({
      meta: { githubActionRequest: "false" },
    });
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-app"]).toBe("cli");
  });

  it("sets x-ditto-app to cli when githubActionRequest is not present", async () => {
    const interceptor = defaultInterceptor({ meta: {} });
    const result = await interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-app"]).toBe("cli");
  });
});
