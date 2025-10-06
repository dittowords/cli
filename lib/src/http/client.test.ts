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

  it("sets baseURL to appContext.apiHost", () => {
    appContext.apiHost = HOST;

    const interceptor = defaultInterceptor();
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.baseURL).toBe(HOST);
  });

  it("sets x-ditto-client-id to appContext.clientId", () => {
    appContext.setClientId(CLIENT_ID);

    const interceptor = defaultInterceptor();
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-client-id"]).toBe(CLIENT_ID);
  });

  it("sets Authorization header to appContext.apiToken when no token is provided", () => {
    const interceptor = defaultInterceptor();
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers.Authorization).toBe(API_TOKEN);
  });

  it("sets Authorization header to provided token", () => {
    const CUSTOM_TOKEN = "custom-token";

    const interceptor = defaultInterceptor({ token: CUSTOM_TOKEN });
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers.Authorization).toBe(CUSTOM_TOKEN);
  });

  it("sets x-ditto-app to github_action when githubActionRequest is true", () => {
    const interceptor = defaultInterceptor({
      meta: { githubActionRequest: "true" },
    });
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-app"]).toBe("github_action");
  });

  it("sets x-ditto-app to cli when githubActionRequest is false", () => {
    const interceptor = defaultInterceptor({
      meta: { githubActionRequest: "false" },
    });
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-app"]).toBe("cli");
  });

  it("sets x-ditto-app to cli when githubActionRequest is not present", () => {
    const interceptor = defaultInterceptor({ meta: {} });
    const result = interceptor(INTERCEPTOR_CONFIG);

    expect(result.headers["x-ditto-app"]).toBe("cli");
  });
});
