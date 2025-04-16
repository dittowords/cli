import fs from "fs";
import * as ConfigService from "../globalConfig";
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
