import Enquirer from "enquirer";
import * as CheckToken from "../../http/checkToken";
import promptForApiToken, { validate } from "./promptForApiToken";

describe("promptForApiToken", () => {
  const mockResponse = { token: "mockToken" };
  let promptSpy: jest.SpiedFunction<typeof Enquirer.prompt>;

  beforeEach(() => {
    promptSpy = jest.spyOn(Enquirer, "prompt").mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should prompt for API token and return it", async () => {
    const response = await promptForApiToken();
    expect(response).toEqual(mockResponse);
    expect(promptSpy).toHaveBeenCalledWith({
      type: "input",
      name: "token",
      message: "What is your API key?",
      validate: expect.any(Function),
    });
  });

  describe("validate", () => {
    let checkTokenSpy: jest.SpiedFunction<typeof CheckToken.default>;

    beforeEach(() => {
      checkTokenSpy = jest
        .spyOn(CheckToken, "default")
        .mockImplementation((token: string) => {
          if (token === "good") {
            return Promise.resolve({ success: true });
          } else if (token === "output") {
            return Promise.resolve({
              success: false,
              output: ["error", "message"],
            });
          } else {
            return Promise.resolve({ success: false });
          }
        });
    });

    it("should return true for valid token", async () => {
      const result = await validate("good");
      expect(result).toBe(true);
      expect(checkTokenSpy).toHaveBeenCalledWith("good");
    });

    it("should return error message for invalid token", async () => {
      const result = await validate("bad");
      expect(result).toBe("Invalid API key");
      expect(checkTokenSpy).toHaveBeenCalledWith("bad");
    });

    it("should return output message for invalid token with output", async () => {
      const result = await validate("output");
      expect(result).toBe("error\nmessage");
      expect(checkTokenSpy).toHaveBeenCalledWith("output");
    });
  });
});
