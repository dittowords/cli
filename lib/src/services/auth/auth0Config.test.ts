import getAuth0Config from "./auth0Config";

const ENV_KEYS = [
  "DITTO_AUTH0_DOMAIN",
  "DITTO_AUTH0_CLIENT_ID",
  "DITTO_AUTH0_AUDIENCE",
] as const;

describe("getAuth0Config", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  // An unfilled PROD block throws the missing-config error at every user.
  it("configures production from source with nothing in the environment", () => {
    expect(getAuth0Config("https://api.dittowords.com")).toEqual({
      domain: "login.dittowords.com",
      clientId: expect.stringMatching(/.+/),
      audience: expect.stringMatching(/^https:\/\/.+/),
    });
  });

  // Falling back to the production client would mint a token with the wrong
  // audience and fail somewhere much less obvious.
  it("refuses a non-production host with nothing configured", () => {
    expect(() => getAuth0Config("https://kooky-api.dittowords.com")).toThrow(
      /DITTO_AUTH0_DOMAIN/
    );
  });

  it("configures a non-production host from the environment", () => {
    process.env.DITTO_AUTH0_DOMAIN = "ditto-dev.auth0.com";
    process.env.DITTO_AUTH0_CLIENT_ID = "dev-client";
    process.env.DITTO_AUTH0_AUDIENCE = "https://api.dev.dittowords.com";

    expect(getAuth0Config("https://kooky-api.dittowords.com")).toEqual({
      domain: "ditto-dev.auth0.com",
      clientId: "dev-client",
      audience: "https://api.dev.dittowords.com",
    });
  });

  it("lets the environment override production too", () => {
    process.env.DITTO_AUTH0_DOMAIN = "ditto-dev.auth0.com";
    process.env.DITTO_AUTH0_CLIENT_ID = "dev-client";
    process.env.DITTO_AUTH0_AUDIENCE = "https://api.dev.dittowords.com";

    expect(getAuth0Config("https://api.dittowords.com")).toMatchObject({
      domain: "ditto-dev.auth0.com",
    });
  });

  it("refuses a localhost API with nothing configured", () => {
    expect(() => getAuth0Config("http://localhost:3001")).toThrow(
      /DITTO_AUTH0_CLIENT_ID/
    );
  });
});
