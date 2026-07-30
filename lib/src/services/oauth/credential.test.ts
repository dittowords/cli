import appContext from "../../utils/appContext";
import * as ConfigService from "../globalConfig";
import * as Discovery from "./discovery";
import * as TokenRequest from "./tokenRequest";
import { getAccessToken } from "./credential";
import { OAuthCredential } from "./types";

const HOUR_MS = 60 * 60 * 1000;

const credential = (overrides: Partial<OAuthCredential> = {}) => ({
  accessToken: "current-access-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + HOUR_MS,
  ...overrides,
});

describe("getAccessToken", () => {
  let refreshSpy: jest.SpiedFunction<typeof TokenRequest.refreshAccessToken>;

  beforeEach(() => {
    jest.spyOn(Discovery, "default").mockResolvedValue({
      authorizationEndpoint: "https://tenant.auth0.com/authorize",
      tokenEndpoint: "https://tenant.auth0.com/oauth/token",
      audience: "https://api.example.com/v2/mcp",
    });
    jest.spyOn(ConfigService, "saveOAuthCredential").mockImplementation();
    refreshSpy = jest
      .spyOn(TokenRequest, "refreshAccessToken")
      .mockResolvedValue(
        credential({ accessToken: "refreshed-access-token" }) as OAuthCredential
      );
  });

  afterEach(() => {
    appContext.setOAuthCredential(undefined);
    jest.restoreAllMocks();
  });

  it("uses the current token while it has time left", async () => {
    expect(await getAccessToken(credential())).toBe("current-access-token");
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("refreshes a token that is about to expire", async () => {
    const expiring = credential({ expiresAt: Date.now() + 5_000 });

    expect(await getAccessToken(expiring)).toBe("refreshed-access-token");
    expect(refreshSpy).toHaveBeenCalledWith({
      tokenEndpoint: "https://tenant.auth0.com/oauth/token",
      refreshToken: "refresh-token",
    });
  });

  it("saves the refreshed credential so the next run starts logged in", async () => {
    await getAccessToken(credential({ expiresAt: Date.now() + 5_000 }));

    expect(ConfigService.saveOAuthCredential).toHaveBeenCalled();
    expect(appContext.oauthCredential?.accessToken).toBe(
      "refreshed-access-token"
    );
  });

  // A pull fans out many requests at once; refreshing per request would burn the
  // refresh token on a tenant that rotates them.
  it("refreshes once for concurrent callers", async () => {
    const expiring = credential({ expiresAt: Date.now() + 5_000 });

    const tokens = await Promise.all([
      getAccessToken(expiring),
      getAccessToken(expiring),
      getAccessToken(expiring),
    ]);

    expect(tokens).toEqual([
      "refreshed-access-token",
      "refreshed-access-token",
      "refreshed-access-token",
    ]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("sends an expired token as-is when there's no refresh token to use", async () => {
    const expired = credential({
      expiresAt: Date.now() - HOUR_MS,
      refreshToken: undefined,
    });

    expect(await getAccessToken(expired)).toBe("current-access-token");
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
