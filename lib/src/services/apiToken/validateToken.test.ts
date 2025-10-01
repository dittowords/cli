import * as CheckToken from "../../http/checkToken";
import * as CollectAndSaveToken from "./collectAndSaveToken";
import validateToken from "./validateToken";

describe("validateToken", () => {
  let checkTokenSpy: jest.SpiedFunction<typeof CheckToken.default>;
  let collectAndSaveTokenSpy: jest.SpiedFunction<
    typeof CollectAndSaveToken.default
  >;

  beforeEach(() => {
    checkTokenSpy = jest
      .spyOn(CheckToken, "default")
      .mockImplementation((token: string) => {
        if (token === "good") {
          return Promise.resolve({ success: true });
        } else {
          return Promise.resolve({ success: false });
        }
      });
    collectAndSaveTokenSpy = jest
      .spyOn(CollectAndSaveToken, "default")
      .mockImplementation(() => Promise.resolve("newToken"));
  });

  afterEach(() => {
    checkTokenSpy.mockRestore();
    collectAndSaveTokenSpy.mockRestore();
  });

  it("should return to provided token if valid", async () => {
    const response = await validateToken("good");
    expect(response).toBe("good");
    expect(checkTokenSpy).toHaveBeenCalledWith("good");
    expect(collectAndSaveTokenSpy).not.toHaveBeenCalled();
  });

  it("should call collectAndSaveToken if token is invalid, and return its result", async () => {
    const response = await validateToken("bad");
    expect(response).toBe("newToken");
    expect(checkTokenSpy).toHaveBeenCalledWith("bad");
    expect(collectAndSaveTokenSpy).toHaveBeenCalled();
  });
});
