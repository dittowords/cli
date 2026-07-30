import Enquirer from "enquirer";
import promptForLoginMethod from "./promptForLoginMethod";

describe("promptForLoginMethod", () => {
  let promptSpy: jest.SpiedFunction<typeof Enquirer.prompt>;

  beforeEach(() => {
    promptSpy = jest
      .spyOn(Enquirer, "prompt")
      .mockResolvedValue({ method: "browser" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("offers both ways to log in and returns the chosen one", async () => {
    expect(await promptForLoginMethod()).toBe("browser");
    expect(promptSpy).toHaveBeenCalledWith({
      type: "select",
      name: "method",
      message: "How do you want to log in?",
      choices: [
        { name: "browser", message: "Log in through your browser" },
        { name: "apiKey", message: "Paste API key" },
      ],
    });
  });

  it("returns the API key choice when that's what was picked", async () => {
    promptSpy.mockResolvedValue({ method: "apiKey" });

    expect(await promptForLoginMethod()).toBe("apiKey");
  });
});
