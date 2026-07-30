import open from "open";

import collectToken from "./collectToken";
import * as PromptForApiToken from "./promptForApiToken";
import * as Quit from "../../utils/quit";
import logger from "../../utils/logger";

jest.mock("open");

describe("collectToken", () => {
  let promptForApiTokenSpy: jest.SpiedFunction<
    typeof PromptForApiToken.default
  >;
  let quitSpy: jest.SpiedFunction<typeof Quit.quit>;

  const token = "token";
  const isTTY = process.stdin.isTTY;

  const setTTY = (value: boolean) => {
    Object.defineProperty(process.stdin, "isTTY", {
      value,
      configurable: true,
    });
  };

  beforeEach(() => {
    logger.url = jest.fn((msg: string) => msg);
    logger.bold = jest.fn((msg: string) => msg);
    logger.info = jest.fn((msg: string) => msg);
    logger.warnText = jest.fn((msg: string) => msg);
    logger.writeLine = jest.fn((msg: string) => {});

    promptForApiTokenSpy = jest
      .spyOn(PromptForApiToken, "default")
      .mockResolvedValue({ token });

    // quit() calls process.exit, which would take the test runner with it.
    quitSpy = jest.spyOn(Quit, "quit").mockResolvedValue(undefined as never);

    // Manual mock, so call history survives restoreMocks between tests.
    (open as unknown as jest.Mock).mockReset();
    (open as unknown as jest.Mock).mockResolvedValue(undefined);
    setTTY(true);
  });

  afterEach(() => {
    setTTY(isTTY as boolean);
    jest.restoreAllMocks();
  });

  it("prompts for API token and returns it", async () => {
    const response = await collectToken();
    expect(response).toBe(token);
    expect(logger.url).toHaveBeenCalled();
    expect(logger.writeLine).toHaveBeenCalled();
    expect(promptForApiTokenSpy).toHaveBeenCalled();
  });

  it("opens the API keys page in the browser", async () => {
    await collectToken();
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("/developers/api-keys")
    );
  });

  it("still prompts when the browser can't be opened", async () => {
    (open as unknown as jest.Mock).mockRejectedValue(new Error("no browser"));

    const response = await collectToken();
    expect(response).toBe(token);
    expect(promptForApiTokenSpy).toHaveBeenCalled();
  });

  describe("without a TTY", () => {
    beforeEach(() => setTTY(false));

    it("quits instead of prompting, so a non-interactive caller can't hang", async () => {
      await collectToken();

      expect(promptForApiTokenSpy).not.toHaveBeenCalled();
      expect(quitSpy).toHaveBeenCalled();
    });

    it("explains how to save a key out of band", async () => {
      await collectToken();

      const message = quitSpy.mock.calls[0][0] as string;
      expect(message).toContain("/developers/api-keys");
      expect(message).toContain("DITTO_TOKEN");
      expect(message).toContain("Open a terminal");
    });

    it("says what an API key is, for readers who won't already know", async () => {
      await collectToken();

      const message = quitSpy.mock.calls[0][0] as string;
      expect(message).toContain("password");
    });

    it("names the login command, not whatever command was actually run", async () => {
      const argv = process.argv;
      process.argv = ["node", "ditto-cli", "scan", "./src"];

      try {
        await collectToken();
      } finally {
        process.argv = argv;
      }

      const message = quitSpy.mock.calls[0][0] as string;
      expect(message).toContain("npx -y @dittowords/cli@latest login");
      expect(message).not.toContain("scan");
    });

    it("does not open a browser nobody is watching", async () => {
      await collectToken();
      expect(open).not.toHaveBeenCalled();
    });
  });
});
