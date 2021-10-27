const tempy = require("tempy");

const config = require("../config");
const { needsToken } = require("./token");

describe("needsToken()", () => {
  it("is true if there is no config file", () => {
    expect(needsToken(tempy.file())).toBeTruthy();
  });

  describe("with a config file", () => {
    let configFile;

    beforeEach(() => {
      configFile = tempy.writeSync("");
    });

    it("returns true if empty", () => {
      expect(needsToken(configFile, "testing.dittowrods.com")).toBeTruthy();
    });

    describe("with some data", () => {
      beforeEach(() => {
        config.saveToken(configFile, "badtesting.dittowords.com", "faketoken");
      });

      it("is true if there is no entries for our API host", () => {
        expect(needsToken(configFile, "testing.dittowords.com")).toBeTruthy();
      });

      it("is false if we have a token listed", () => {
        config.saveToken(configFile, "testing.dittowords.com", "faketoken");
        expect(needsToken(configFile, "testing.dittowords.com")).toBeFalsy();
      });
    });

    it("is true if there is no token listed", () => {
      const configNoToken = "../../testing/fixtures/ditto-config-no-token";
      expect(needsToken(configNoToken, "testing.dittowords.com")).toBeTruthy();
    });

    it("is strips the protocol when writing an entry", () => {
      config.saveToken(
        configFile,
        "https://testing.dittowords.com",
        "faketoken"
      );
      expect(needsToken(configFile, "testing.dittowords.com")).toBeFalsy();
    });
  });
});
