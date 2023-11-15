/* eslint-disable no-underscore-dangle */
import fs from "fs";
import path from "path";
import tempy from "tempy";
import yaml from "js-yaml";
import config from "./config";

const fakeHomedir = fs.mkdtempSync(path.join(__dirname, "../testing/tmp"));

describe("Config File", () => {
  const expectedConfigDir = path.join(fakeHomedir, ".config");

  beforeEach(() => {
    if (!fs.existsSync(fakeHomedir)) fs.mkdirSync(fakeHomedir);
  });

  afterEach(() => {
    fs.rmdirSync(fakeHomedir, { recursive: true });
  });

  describe("createFileIfMissing", () => {
    const expectedConfigFile = path.join(expectedConfigDir, "ditto");

    it("creates a config file if the config dir is missing", () => {
      config.createFileIfMissing(expectedConfigFile);
      expect(fs.existsSync(expectedConfigFile)).toBeTruthy();
    });
    it("creates a config file if it's missing", () => {
      fs.mkdirSync(expectedConfigDir);
      config.createFileIfMissing(expectedConfigFile);
      expect(fs.existsSync(expectedConfigFile)).toBeTruthy();
    });

    it("does nothing if it already exists", () => {
      fs.mkdirSync(expectedConfigDir);
      fs.closeSync(fs.openSync(expectedConfigFile, "w"));
      config.createFileIfMissing(expectedConfigFile);
      expect(fs.existsSync(expectedConfigFile)).toBeTruthy();
    });
  });
});

describe("Tokens in config files", () => {
  const configFile = path.join(fakeHomedir, "ditto");

  beforeEach(() => {
    config.createFileIfMissing(configFile);
    config.saveToken(configFile, "testing.dittowords.com", "faketoken");
  });

  afterEach(() => {
    fs.rmdirSync(fakeHomedir, { recursive: true });
  });

  describe("saveToken", () => {
    it("creates a config file with config data", () => {
      const fileContents = fs.readFileSync(configFile, "utf8");
      const configData = yaml.load(fileContents) as Record<string, any>;
      if (configData && typeof configData === "object") {
        expect(configData["testing.dittowords.com"]).toBeDefined();
        expect(configData["testing.dittowords.com"][0].token).toEqual(
          "faketoken"
        );
      } else {
        fail("Config Data should have been an object!");
      }
    });
  });

  describe("getToken", () => {
    it("can retrieve the saved token value", () => {
      expect(config.getToken(configFile, "testing.dittowords.com")).toEqual(
        "faketoken"
      );
    });
  });
});
