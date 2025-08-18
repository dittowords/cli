import collectToken from "./collectToken";
import * as PromptForApiToken from "./promptForApiToken";
import logger from "../../utils/logger";

describe("collectToken", () => {
  let promptForApiTokenSpy: jest.SpiedFunction<
    typeof PromptForApiToken.default
  >;

  const token = "token";

  beforeEach(() => {
    logger.url = jest.fn((msg: string) => msg);
    logger.bold = jest.fn((msg: string) => msg);
    logger.info = jest.fn((msg: string) => msg);
    logger.writeLine = jest.fn((msg: string) => {});

    promptForApiTokenSpy = jest
      .spyOn(PromptForApiToken, "default")
      .mockResolvedValue({ token });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prompts for API token and returns it", async () => {
    const response = await collectToken();
    expect(response).toBe(token);
    expect(logger.url).toHaveBeenCalled();
    expect(logger.writeLine).toHaveBeenCalled();
    expect(promptForApiTokenSpy).toHaveBeenCalled();
  });
});
