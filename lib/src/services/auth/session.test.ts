import * as configService from "../globalConfig";
import * as Auth0Config from "./auth0Config";
import * as DeviceFlow from "./loopbackFlow";
import { resolveOAuthHeader } from "./session";

describe("resolveOAuthHeader", () => {
  const future = () => Date.now() + 60_000;
  const past = () => Date.now() - 60_000;

  beforeEach(() => {
    jest.spyOn(Auth0Config, "default").mockReturnValue({
      domain: "tenant.auth0.com",
      clientId: "client",
      audience: "https://audience",
    });
    jest.spyOn(configService, "saveOAuthSession").mockImplementation(() => {});
  });

  it("returns null when no session is stored", async () => {
    jest.spyOn(configService, "readCredential").mockReturnValue(undefined);

    expect(await resolveOAuthHeader()).toBeNull();
  });

  it("uses a stored access token that hasn't expired", async () => {
    jest.spyOn(configService, "readCredential").mockReturnValue({
      oauth: {
        accessToken: "still-good",
        refreshToken: "rt",
        expiresAt: future(),
      },
    });
    const refreshSpy = jest.spyOn(DeviceFlow, "refreshSession");

    expect(await resolveOAuthHeader()).toBe("Bearer still-good");
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("refreshes an expired session and persists the new one", async () => {
    jest.spyOn(configService, "readCredential").mockReturnValue({
      oauth: { accessToken: "stale", refreshToken: "rt", expiresAt: past() },
    });
    const renewed = {
      accessToken: "fresh",
      refreshToken: "rt2",
      expiresAt: future(),
    };
    jest.spyOn(DeviceFlow, "refreshSession").mockResolvedValue(renewed);

    expect(await resolveOAuthHeader()).toBe("Bearer fresh");
    expect(configService.saveOAuthSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      renewed
    );
  });

  it("returns null when an expired session has no refresh token", async () => {
    jest.spyOn(configService, "readCredential").mockReturnValue({
      oauth: { accessToken: "stale", expiresAt: past() },
    });

    expect(await resolveOAuthHeader()).toBeNull();
  });

  it("returns null when the refresh token is spent", async () => {
    jest.spyOn(configService, "readCredential").mockReturnValue({
      oauth: { accessToken: "stale", refreshToken: "rt", expiresAt: past() },
    });
    jest.spyOn(DeviceFlow, "refreshSession").mockResolvedValue(null);

    expect(await resolveOAuthHeader()).toBeNull();
    expect(configService.saveOAuthSession).not.toHaveBeenCalled();
  });
});
