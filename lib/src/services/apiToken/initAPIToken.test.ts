import * as ConfigService from "../globalConfig";
import * as Session from "../auth/session";
import * as ValidateToken from "./validateToken";
import * as CollectAndSaveToken from "./collectAndSaveToken";
import * as GetURLHostname from "./getURLHostname";
import initAPIToken from "./initAPIToken";
import appContext from "../../utils/appContext";

describe("initAPIToken", () => {
  let validateTokenSpy: jest.SpiedFunction<typeof ValidateToken.default>;
  let collectAndSaveTokenSpy: jest.SpiedFunction<
    typeof CollectAndSaveToken.default
  >;
  let readCredentialSpy: jest.SpiedFunction<
    typeof ConfigService.readCredential
  >;
  let resolveOAuthHeaderSpy: jest.SpiedFunction<
    typeof Session.resolveOAuthHeader
  >;
  let getURLHostnameSpy: jest.SpiedFunction<typeof GetURLHostname.default>;
  let priorToken: string | undefined;

  beforeEach(() => {
    priorToken = appContext.authToken;
    appContext.setAuthToken("");

    validateTokenSpy = jest
      .spyOn(ValidateToken, "default")
      .mockImplementation((token: string) => Promise.resolve(token));
    collectAndSaveTokenSpy = jest
      .spyOn(CollectAndSaveToken, "default")
      .mockImplementation((host?: string) => {
        if (host) {
          return Promise.resolve("tokenWithHost");
        } else {
          return Promise.resolve("newToken");
        }
      });
    readCredentialSpy = jest
      .spyOn(ConfigService, "readCredential")
      .mockReturnValue(undefined);
    resolveOAuthHeaderSpy = jest
      .spyOn(Session, "resolveOAuthHeader")
      .mockResolvedValue(null);
    getURLHostnameSpy = jest
      .spyOn(GetURLHostname, "default")
      .mockReturnValue("urlHostname");
  });

  afterEach(() => {
    appContext.setAuthToken(priorToken);
    jest.restoreAllMocks();
  });

  it("should validate and return the token if provided", async () => {
    appContext.setAuthToken("validToken");
    const response = await initAPIToken();
    expect(response).toBe("validToken");
    expect(validateTokenSpy).toHaveBeenCalledWith("validToken");
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
    expect(readCredentialSpy).not.toHaveBeenCalled();
    expect(getURLHostnameSpy).not.toHaveBeenCalled();
  });

  // CI has no browser, so DITTO_TOKEN has to win over anything saved on disk.
  it("should prefer a provided token over a saved OAuth session", async () => {
    appContext.setAuthToken("ciToken");
    resolveOAuthHeaderSpy.mockResolvedValue("Bearer fromSession");

    const response = await initAPIToken();

    expect(response).toBe("ciToken");
    expect(resolveOAuthHeaderSpy).not.toHaveBeenCalled();
  });

  it("should use a saved OAuth session ahead of a saved API key", async () => {
    resolveOAuthHeaderSpy.mockResolvedValue("Bearer fromSession");
    readCredentialSpy.mockReturnValue({ token: "myToken" });

    const response = await initAPIToken();

    expect(response).toBe("Bearer fromSession");
    expect(validateTokenSpy).not.toHaveBeenCalled();
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
  });

  // Reading the config creates the file, so a first run must still reach the
  // session rather than being pushed at the API key prompt.
  it("should use a saved OAuth session on a first run", async () => {
    resolveOAuthHeaderSpy.mockResolvedValue("Bearer fromSession");
    readCredentialSpy.mockReturnValue(undefined);

    expect(await initAPIToken()).toBe("Bearer fromSession");
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
  });

  describe("should collect and save token based on config if config does not have a token", () => {
    const expectCollectsFromConfig = () => {
      expect(validateTokenSpy).not.toHaveBeenCalled();
      expect(readCredentialSpy).toHaveBeenCalledWith(
        appContext.configFile,
        "urlHostname"
      );
      expect(getURLHostnameSpy).toHaveBeenCalledWith(appContext.apiHost);
      expect(collectAndSaveTokenSpy).toHaveBeenCalledWith("urlHostname");
    };

    it("config has no entry for the host", async () => {
      readCredentialSpy.mockReturnValue(undefined);
      const response = await initAPIToken();
      expect(response).toBe("tokenWithHost");
      expectCollectsFromConfig();
    });

    it("the host's entry has no token", async () => {
      readCredentialSpy.mockReturnValue({});
      const response = await initAPIToken();
      expect(response).toBe("tokenWithHost");
      expectCollectsFromConfig();
    });

    it("the host's token is an empty string", async () => {
      readCredentialSpy.mockReturnValue({ token: "" });
      const response = await initAPIToken();
      expect(response).toBe("tokenWithHost");
      expectCollectsFromConfig();
    });
  });

  it("should validate and return the token from the config file", async () => {
    readCredentialSpy.mockReturnValue({ token: "myToken" });
    const response = await initAPIToken();
    expect(response).toBe("myToken");
    expect(validateTokenSpy).toHaveBeenCalledWith("myToken");
    expect(readCredentialSpy).toHaveBeenCalledWith(
      appContext.configFile,
      "urlHostname"
    );
    expect(getURLHostnameSpy).toHaveBeenCalledWith(appContext.apiHost);
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
  });

  // Expired past renewal. The API key prompt would hide the actual fix.
  it("should tell the user to log in again when a stored session can't be renewed", async () => {
    readCredentialSpy.mockReturnValue({
      token: "",
      oauth: { accessToken: "stale", expiresAt: 1 },
    });

    await expect(initAPIToken()).rejects.toThrow(/ditto login/);
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
  });
});
