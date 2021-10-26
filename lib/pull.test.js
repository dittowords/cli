const tempy = require("tempy");
const rewire = require("rewire");

const pull = rewire("./pull");

const shouldOverwrite = pull.__get__("shouldOverwrite");

describe("shouldOverwrite", () => {
  let config;
  let configOverwrite;
  let configNever;

  beforeEach(() => {
    config = { settings: {} };
    configOverwrite = { settings: { overwrite: true } };
    configNever = { settings: { overwrite: false } };
  });

  it("returns true if there's no file", () => {
    expect(shouldOverwrite(config, ".doesnotexist")).toBeTruthy();
  });

  describe("when the file exists", () => {
    let existingFile;
    beforeAll(() => {
      existingFile = tempy.writeSync("");
    });
    it("returns 'ask' if there is no config setting", () => {
      expect(shouldOverwrite(config, existingFile)).toEqual("ASK");
    });

    it("returns true if config says overwrite", () => {
      expect(shouldOverwrite(configOverwrite, existingFile)).toEqual(true);
    });

    it("returns false if config says don't overwrite", () => {
      expect(shouldOverwrite(configNever, existingFile)).toEqual(false);
    });
  });
});
