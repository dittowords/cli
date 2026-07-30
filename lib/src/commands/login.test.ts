import { login } from "./login";
import * as InitAPIToken from "../services/apiToken/initAPIToken";
import * as Quit from "../utils/quit";
import appContext from "../utils/appContext";
import logger from "../utils/logger";

describe("login", () => {
  let initAPITokenSpy: jest.SpiedFunction<typeof InitAPIToken.default>;
  let quitSpy: jest.SpiedFunction<typeof Quit.quit>;
  let written: string[];

  const token = "a-valid-key";

  beforeEach(() => {
    written = [];

    logger.info = jest.fn((msg: string) => msg);
    logger.success = jest.fn((msg: string) => msg);
    logger.writeLine = jest.fn((msg: string) => {
      written.push(msg);
    });

    initAPITokenSpy = jest
      .spyOn(InitAPIToken, "default")
      .mockResolvedValue(token);

    quitSpy = jest.spyOn(Quit, "quit").mockResolvedValue(undefined as never);

    delete process.env.DITTO_TOKEN;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resolves a token and exits 0", async () => {
    await login();

    expect(initAPITokenSpy).toHaveBeenCalled();
    expect(quitSpy).toHaveBeenCalledWith(null, 0);
  });

  it("says where the key was saved", async () => {
    await login();

    expect(written.join("\n")).toContain(appContext.configFile);
  });

  it("credits DITTO_TOKEN when that's where the key came from", async () => {
    process.env.DITTO_TOKEN = token;

    await login();

    const output = written.join("\n");
    expect(output).toContain("DITTO_TOKEN");
    expect(output).not.toContain(appContext.configFile);
  });

  describe("after a browser login", () => {
    beforeEach(() => {
      // A browser login returns no token and leaves the credential on the context.
      initAPITokenSpy.mockResolvedValue(undefined);
      appContext.setOAuthCredential({
        accessToken: "access-token",
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    });

    afterEach(() => {
      appContext.setOAuthCredential(undefined);
    });

    it("says where the login was saved", async () => {
      await login();

      const output = written.join("\n");
      expect(output).toContain("Your login is saved in");
      expect(output).toContain(appContext.configFile);
      expect(quitSpy).toHaveBeenCalledWith(null, 0);
    });

    // Both the token and an unset DITTO_TOKEN are undefined, and comparing them
    // for equality would credit an environment variable that isn't there.
    it("doesn't credit DITTO_TOKEN", async () => {
      await login();

      expect(written.join("\n")).not.toContain("DITTO_TOKEN");
    });
  });

  it("stays quiet when there was no terminal to prompt in", async () => {
    // collectToken quits and returns "" in that case; login must not then
    // claim success on top of the message explaining what to do.
    initAPITokenSpy.mockResolvedValue("");

    await login();

    expect(written).toHaveLength(0);
    expect(quitSpy).not.toHaveBeenCalled();
  });
});
