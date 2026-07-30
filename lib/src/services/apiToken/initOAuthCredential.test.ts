import * as CheckToken from "../../http/checkToken";
import appContext from "../../utils/appContext";
import * as Constants from "../../utils/constants";
import logger from "../../utils/logger";
import * as BrowserLogin from "../oauth/browserLogin";
import * as Credential from "../oauth/credential";
import * as CollectAndSaveToken from "./collectAndSaveToken";
import initOAuthCredential from "./initOAuthCredential";
import * as PromptForLoginMethod from "./promptForLoginMethod";

const OAUTH_CREDENTIAL = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 1893456000000,
};

describe("initOAuthCredential", () => {
  let promptSpy: jest.SpiedFunction<typeof PromptForLoginMethod.default>;
  let browserLoginSpy: jest.SpiedFunction<typeof BrowserLogin.default>;
  let collectAndSaveTokenSpy: jest.SpiedFunction<
    typeof CollectAndSaveToken.default
  >;
  let priorIsTTY: boolean | undefined;

  beforeEach(() => {
    priorIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;

    logger.writeLine = jest.fn();
    jest.spyOn(Constants, "isOAuthConfigured").mockReturnValue(true);
    jest.spyOn(Credential, "persistCredential").mockImplementation();
    promptSpy = jest
      .spyOn(PromptForLoginMethod, "default")
      .mockResolvedValue("browser");
    browserLoginSpy = jest
      .spyOn(BrowserLogin, "default")
      .mockResolvedValue(OAUTH_CREDENTIAL);
    collectAndSaveTokenSpy = jest
      .spyOn(CollectAndSaveToken, "default")
      .mockResolvedValue("collectedToken");
  });

  afterEach(() => {
    process.stdin.isTTY = priorIsTTY as boolean;
    appContext.setOAuthCredential(undefined);
    jest.restoreAllMocks();
  });

  it("asks how to log in when the choice wasn't made up front", async () => {
    expect(await initOAuthCredential()).toBeUndefined();

    expect(promptSpy).toHaveBeenCalled();
    expect(browserLoginSpy).toHaveBeenCalled();
    expect(Credential.persistCredential).toHaveBeenCalledWith(OAUTH_CREDENTIAL);
  });

  it("collects an API key when that's what was chosen", async () => {
    promptSpy.mockResolvedValue("apiKey");

    expect(await initOAuthCredential("urlHostname")).toBe("collectedToken");
    expect(browserLoginSpy).not.toHaveBeenCalled();
    expect(collectAndSaveTokenSpy).toHaveBeenCalledWith("urlHostname");
  });

  describe("when the choice arrives with the command", () => {
    it("goes straight to the browser for --browser", async () => {
      expect(
        await initOAuthCredential(undefined, undefined, "browser")
      ).toBeUndefined();

      expect(promptSpy).not.toHaveBeenCalled();
      expect(browserLoginSpy).toHaveBeenCalled();
    });

    it("goes straight to the key prompt for --api-key", async () => {
      expect(await initOAuthCredential(undefined, undefined, "apiKey")).toBe(
        "collectedToken"
      );

      expect(promptSpy).not.toHaveBeenCalled();
      expect(browserLoginSpy).not.toHaveBeenCalled();
    });
  });

  // The environment variable is the automation path, so a non-interactive run
  // must not offer a choice or sit waiting on a browser.
  it("skips the choice when there's no terminal to ask in", async () => {
    process.stdin.isTTY = false;

    expect(await initOAuthCredential()).toBe("collectedToken");
    expect(promptSpy).not.toHaveBeenCalled();
    expect(browserLoginSpy).not.toHaveBeenCalled();
  });

  it("says so rather than ignoring --browser when it isn't available yet", async () => {
    jest.spyOn(Constants, "isOAuthConfigured").mockReturnValue(false);

    expect(await initOAuthCredential(undefined, undefined, "browser")).toBe(
      "collectedToken"
    );
    expect(logger.writeLine).toHaveBeenCalled();
    expect(browserLoginSpy).not.toHaveBeenCalled();
  });

  it("uses a stored credential that still works, without asking anything", async () => {
    jest.spyOn(CheckToken, "default").mockResolvedValue({ success: true });

    expect(
      await initOAuthCredential("urlHostname", OAUTH_CREDENTIAL)
    ).toBeUndefined();

    expect(appContext.oauthCredential).toEqual(OAUTH_CREDENTIAL);
    expect(promptSpy).not.toHaveBeenCalled();
    expect(browserLoginSpy).not.toHaveBeenCalled();
  });

  it("asks again when the stored credential no longer works", async () => {
    jest
      .spyOn(CheckToken, "default")
      .mockResolvedValue({ success: false, output: ["expired"] });

    await initOAuthCredential("urlHostname", OAUTH_CREDENTIAL);

    expect(promptSpy).toHaveBeenCalled();
    expect(browserLoginSpy).toHaveBeenCalled();
  });

  it("falls back to an API key when the browser login fails", async () => {
    browserLoginSpy.mockRejectedValue(new Error("Auth0 said no"));

    expect(await initOAuthCredential("urlHostname")).toBe("collectedToken");
    expect(collectAndSaveTokenSpy).toHaveBeenCalledWith("urlHostname");
  });
});
