import * as CollectToken from "./collectToken";
import * as GetURLHostname from "./getURLHostname";
import * as configService from "../globalConfig";
import appContext from "../../utils/appContext";
import * as utils from "../../utils/quit";
import collectAndSaveToken from "./collectAndSaveToken";

describe("collectAndSaveToken", () => {
  let priorToken: string | undefined;
  let priorHost: string;

  let collectTokenSpy: jest.SpiedFunction<typeof CollectToken.default>;
  let getURLHostnameSpy: jest.SpiedFunction<typeof GetURLHostname.default>;
  let saveTokenSpy: jest.SpiedFunction<typeof configService.saveToken>;
  let quitSpy: jest.SpiedFunction<typeof utils.quit>;

  const token = "token";
  const host = "host";
  const apiHost = "apiHost";
  const sanitizedHost = "hostname";

  beforeEach(() => {
    priorToken = appContext.apiToken;
    priorHost = appContext.apiHost;
    appContext.setApiToken("");
    appContext.apiHost = apiHost;
    collectTokenSpy = jest.spyOn(CollectToken, "default");
    getURLHostnameSpy = jest
      .spyOn(GetURLHostname, "default")
      .mockReturnValue(sanitizedHost);
    saveTokenSpy = jest
      .spyOn(configService, "saveToken")
      .mockImplementation(() => Promise.resolve());
    quitSpy = jest
      .spyOn(utils, "quit")
      .mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    appContext.setApiToken(priorToken);
    appContext.apiHost = priorHost;
    jest.restoreAllMocks();
  });

  it("collects, saves and returns a token", async () => {
    collectTokenSpy.mockResolvedValue(token);

    expect(appContext.apiToken).toBe("");
    const result = await collectAndSaveToken();

    expect(collectTokenSpy).toHaveBeenCalled();
    expect(getURLHostnameSpy).toHaveBeenCalledWith(appContext.apiHost);
    expect(saveTokenSpy).toHaveBeenCalledWith(
      appContext.configFile,
      sanitizedHost,
      token
    );
    expect(result).toBe(token);
    expect(appContext.apiToken).toBe(token);
  });

  it("uses the host if provided", async () => {
    collectTokenSpy.mockResolvedValue(token);

    expect(appContext.apiToken).toBe("");

    const result = await collectAndSaveToken(host);
    expect(collectTokenSpy).toHaveBeenCalled();
    expect(getURLHostnameSpy).toHaveBeenCalledWith(host);
    expect(saveTokenSpy).toHaveBeenCalledWith(
      appContext.configFile,
      sanitizedHost,
      token
    );
    expect(result).toBe(token);
  });

  it("handles empty string error", async () => {
    collectTokenSpy.mockImplementation(() => Promise.reject(""));

    expect(appContext.apiToken).toBe("");
    const response = await collectAndSaveToken();

    expect(collectTokenSpy).toHaveBeenCalled();
    expect(quitSpy).toHaveBeenCalledWith("", 0);
    expect(appContext.apiToken).toBe("");
    expect(response).toBe("");
    expect(getURLHostnameSpy).not.toHaveBeenCalled();
    expect(saveTokenSpy).not.toHaveBeenCalled();
  });

  it("handles other errors", async () => {
    collectTokenSpy.mockImplementation(() => Promise.reject("some error"));

    expect(appContext.apiToken).toBe("");
    const response = await collectAndSaveToken();

    expect(collectTokenSpy).toHaveBeenCalled();
    expect(quitSpy).toHaveBeenCalledWith(expect.stringContaining("Error ID:"));
    expect(appContext.apiToken).toBe("");
    expect(response).toBe("");
    expect(getURLHostnameSpy).not.toHaveBeenCalled();
    expect(saveTokenSpy).not.toHaveBeenCalled();
  });
});
