import fs from "fs";
import * as ConfigService from "../globalConfig";
import * as ValidateToken from "./validateToken";
import * as CollectAndSaveToken from "./collectAndSaveToken";
import * as GetURLHostname from "./getURLHostname";
import initAPIToken from "./initAPIToken";
import appContext from "../../utils/appContext";
import * as CheckToken from "../../http/checkToken";

describe("initAPIToken", () => {
  let validateTokenSpy: jest.SpiedFunction<typeof ValidateToken.default>;
  let collectAndSaveTokenSpy: jest.SpiedFunction<
    typeof CollectAndSaveToken.default
  >;
  let existsSyncSpy: jest.SpyInstance;
  let readGlobalConfigDataSpy: jest.SpiedFunction<
    typeof ConfigService.readGlobalConfigData
  >;
  let getURLHostnameSpy: jest.SpiedFunction<typeof GetURLHostname.default>;
  let priorToken: string | undefined;

  beforeEach(() => {
    priorToken = appContext.apiToken;
    appContext.setApiToken("");

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
    existsSyncSpy = jest.spyOn(fs, "existsSync");
    readGlobalConfigDataSpy = jest.spyOn(ConfigService, "readGlobalConfigData");
    getURLHostnameSpy = jest
      .spyOn(GetURLHostname, "default")
      .mockReturnValue("urlHostname");
  });

  afterEach(() => {
    appContext.setApiToken(priorToken);
    jest.restoreAllMocks();
  });

  it("should validate and return the token if provided", async () => {
    appContext.setApiToken("validToken");
    const response = await initAPIToken();
    expect(response).toBe("validToken");
    expect(validateTokenSpy).toHaveBeenCalledWith("validToken");
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
    expect(readGlobalConfigDataSpy).not.toHaveBeenCalled();
    expect(getURLHostnameSpy).not.toHaveBeenCalled();
  });

  it("should call collectAndSaveToken if no token is provided and config file does not exist", async () => {
    existsSyncSpy.mockReturnValue(false);
    const response = await initAPIToken();
    expect(response).toBe("newToken");
    expect(validateTokenSpy).not.toHaveBeenCalled();
    expect(collectAndSaveTokenSpy).toHaveBeenCalled();
    expect(existsSyncSpy).toHaveBeenCalledWith(appContext.configFile);
    expect(readGlobalConfigDataSpy).not.toHaveBeenCalled();
    expect(getURLHostnameSpy).not.toHaveBeenCalled();
  });

  describe("should collect and save token based on config if config does not have a token", () => {
    const expectCollectsFromConfig = () => {
      expect(validateTokenSpy).not.toHaveBeenCalled();
      expect(existsSyncSpy).toHaveBeenCalledWith(appContext.configFile);
      expect(readGlobalConfigDataSpy).toHaveBeenCalledWith(
        appContext.configFile
      );
      expect(getURLHostnameSpy).toHaveBeenCalledWith(appContext.apiHost);
      expect(collectAndSaveTokenSpy).toHaveBeenCalledWith("urlHostname");
    };

    it("config[host] does not exist", async () => {
      existsSyncSpy.mockReturnValue(true);
      const configData = {};
      readGlobalConfigDataSpy.mockReturnValue(configData);
      const response = await initAPIToken();
      expect(response).toBe("tokenWithHost");
      expectCollectsFromConfig();
    });

    it("config[host][0] does not exist", async () => {
      existsSyncSpy.mockReturnValue(true);
      const configData = { urlHostname: [] };
      readGlobalConfigDataSpy.mockReturnValue(configData);
      const response = await initAPIToken();
      expect(response).toBe("tokenWithHost");
      expectCollectsFromConfig();
    });

    it("config[host][0].token is empty string", async () => {
      existsSyncSpy.mockReturnValue(true);
      const configData = { urlHostname: [{ token: "" }] };
      readGlobalConfigDataSpy.mockReturnValue(configData);
      const response = await initAPIToken();
      expect(response).toBe("tokenWithHost");
      expectCollectsFromConfig();
    });
  });

  it("should validate and return the token from the config file", async () => {
    existsSyncSpy.mockReturnValue(true);
    const configData = { urlHostname: [{ token: "myToken" }] };
    readGlobalConfigDataSpy.mockReturnValue(configData);
    const response = await initAPIToken();
    expect(response).toBe("myToken");
    expect(validateTokenSpy).toHaveBeenCalledWith("myToken");
    expect(existsSyncSpy).toHaveBeenCalledWith(appContext.configFile);
    expect(readGlobalConfigDataSpy).toHaveBeenCalledWith(appContext.configFile);
    expect(getURLHostnameSpy).toHaveBeenCalledWith(appContext.apiHost);
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
  });
});

describe("initAPIToken credential precedence", () => {
  const OAUTH_CREDENTIAL = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1893456000000,
  };
  let priorToken: string | undefined;

  beforeEach(() => {
    priorToken = appContext.apiToken;
    appContext.setApiToken("");
    appContext.setOAuthCredential(undefined);

    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(GetURLHostname, "default").mockReturnValue("urlHostname");
    jest
      .spyOn(ValidateToken, "default")
      .mockImplementation((token: string) => Promise.resolve(token));
    jest
      .spyOn(CollectAndSaveToken, "default")
      .mockResolvedValue("collectedToken");
    jest.spyOn(CheckToken, "default").mockResolvedValue({ success: true });
  });

  afterEach(() => {
    appContext.setApiToken(priorToken);
    appContext.setOAuthCredential(undefined);
    jest.restoreAllMocks();
  });

  // An API key is the credential automation and existing users already rely on,
  // so a stored browser login must never take it out of the running.
  it("prefers a stored API key over a stored browser login", async () => {
    jest.spyOn(ConfigService, "readGlobalConfigData").mockReturnValue({
      urlHostname: [{ token: "myToken", oauth: OAUTH_CREDENTIAL }],
    });

    expect(await initAPIToken()).toBe("myToken");
    expect(appContext.oauthCredential).toBeUndefined();
  });

  it("prefers DITTO_TOKEN over a stored browser login", async () => {
    appContext.setApiToken("environmentToken");
    jest.spyOn(ConfigService, "readGlobalConfigData").mockReturnValue({
      urlHostname: [{ oauth: OAUTH_CREDENTIAL }],
    });

    expect(await initAPIToken()).toBe("environmentToken");
    expect(appContext.oauthCredential).toBeUndefined();
  });

  it("uses a stored browser login when no API key is configured", async () => {
    jest.spyOn(ConfigService, "readGlobalConfigData").mockReturnValue({
      urlHostname: [{ oauth: OAUTH_CREDENTIAL }],
    });

    expect(await initAPIToken()).toBeUndefined();
    expect(appContext.oauthCredential).toEqual(OAUTH_CREDENTIAL);
    expect(CollectAndSaveToken.default).not.toHaveBeenCalled();
  });

  it("asks for an API key when the stored browser login no longer works", async () => {
    jest.spyOn(ConfigService, "readGlobalConfigData").mockReturnValue({
      urlHostname: [{ oauth: OAUTH_CREDENTIAL }],
    });
    jest
      .spyOn(CheckToken, "default")
      .mockResolvedValue({ success: false, output: ["expired"] });

    expect(await initAPIToken()).toBe("collectedToken");
    expect(appContext.oauthCredential).toBeUndefined();
  });
});
