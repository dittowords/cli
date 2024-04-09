import fs from "fs";
import config from "../config";
import { randomUUID } from "crypto";
import { needsToken } from "./token";
import { _test } from "./token";
import { vol } from "memfs";
import { jest } from "@jest/globals";
import axios from "axios";

jest.mock("fs");
jest.mock("../api");

const axiosMocked = jest.mocked(axios);

const defaultEnv = { ...process.env };

beforeEach(() => {
  vol.reset();
  process.env = { ...defaultEnv };
});

describe("needsToken", () => {
  it("is true if there is no config file", () => {
    expect(needsToken(randomUUID())).toBeTruthy();
  });

  it("is false if there is a token in the environment", () => {
    process.env.DITTO_API_KEY = "xxx-xxx-xxx";
    expect(needsToken(randomUUID())).toBe(false);
  });

  describe("with a config file", () => {
    let configFile = "";

    beforeEach(async () => {
      configFile = `/${randomUUID()}`;
      await new Promise((resolve, reject) =>
        fs.writeFile(configFile, "", (err) => {
          if (err) reject(err);
          else {
            resolve(null);
          }
        })
      );
    });

    it("returns true if empty", () => {
      expect(needsToken(configFile, "testing.dittowords.com")).toBeTruthy();
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

const { verifyTokenUsingTokenCheck } = _test;
describe("verifyTokenUsingTokenCheck", () => {
  it("returns success: true for api success response", async () => {
    axiosMocked.get.mockResolvedValueOnce({ status: 200 });
    const result = await verifyTokenUsingTokenCheck("xxx-xxx");
    expect(result.success).toBe(true);
  });
  it("returns success: false for api unauthorized response", async () => {
    axiosMocked.get.mockResolvedValueOnce({ status: 401 });
    const result = await verifyTokenUsingTokenCheck("xxx-xxx");
    expect(result.success).toBe(false);
  });
  it("returns success: false for api invalid response", async () => {
    axiosMocked.get.mockResolvedValueOnce("error");
    const result = await verifyTokenUsingTokenCheck("xxx-xxx");
    expect(result.success).toBe(false);
  });
});
