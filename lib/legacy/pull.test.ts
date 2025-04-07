import { pull } from "./pull";
import { vol } from "memfs";
import consts from "./consts";
import { jest } from "@jest/globals";
import axios from "axios";
const axiosMock = jest.mocked(axios);
import fs from "fs";

jest.mock("fs");
jest.mock("./api");

jest.mock("./http/fetchComponentFolders");
jest.mock("./http/fetchComponents");
jest.mock("./http/fetchVariants");

const defaultEnv = { ...process.env };

beforeEach(() => {
  vol.reset();
  process.env = { ...defaultEnv };
});

const mockGlobalConfigFile = `
api.dittowords.com:
  - token: xxx-xxx-xxx
`;
const mockProjectConfigFile = `
sources:
  components: true
  projects:
    - id: project-id-1
      name: Test Project
variants: true
`;

describe("pull", () => {
  it("correctly writes files to disk per source for basic config", async () => {
    process.env.DITTO_TEXT_DIR = "/ditto";
    process.env.DITTO_PROJECT_CONFIG_FILE = "/ditto/config.yml";

    // we need to manually mock responses for the http calls that happen
    // directly within the pull function; we don't need to mock the http
    // calls that happen by way of http/* function calls since those have
    // their own mocks already.
    axiosMock.get.mockImplementation(
      (): Promise<any> => Promise.resolve({ data: "data" })
    );

    vol.fromJSON({
      [consts.CONFIG_FILE]: mockGlobalConfigFile,
      [consts.PROJECT_CONFIG_FILE]: mockProjectConfigFile,
    });

    await pull();

    const filesOnDiskExpected = new Set([
      "components__example-folder__base.json",
      "components__example-folder__example-variant-1.json",
      "components__example-folder__example-variant-2.json",
      "components__root__base.json",
      "components__root__example-variant-1.json",
      "components__root__example-variant-2.json",
      "test-project__base.json",
      "test-project__example-variant-1.json",
      "test-project__example-variant-2.json",
      "index.d.ts",
      "index.js",
    ]);

    const filesOnDisk = fs.readdirSync("/ditto");
    filesOnDisk.forEach((file) => {
      filesOnDiskExpected.delete(file);
    });

    expect(filesOnDiskExpected.size).toBe(0);
  });

  it("correctly does not write index.js or index.d.ts when `disableJsDriver: true` is specified", async () => {
    process.env.DITTO_TEXT_DIR = "/ditto";
    process.env.DITTO_PROJECT_CONFIG_FILE = "/ditto/config.yml";

    // we need to manually mock responses for the http calls that happen
    // directly within the pull function; we don't need to mock the http
    // calls that happen by way of http/* function calls since those have
    // their own mocks already.
    axiosMock.get.mockImplementation(
      (): Promise<any> => Promise.resolve({ data: "data" })
    );

    vol.fromJSON({
      [consts.CONFIG_FILE]: mockGlobalConfigFile,
      [consts.PROJECT_CONFIG_FILE]:
        mockProjectConfigFile + "\n" + "disableJsDriver: true",
    });

    await pull();

    const filesOnDiskExpected = new Set([
      "components__example-folder__base.json",
      "components__example-folder__example-variant-1.json",
      "components__example-folder__example-variant-2.json",
      "components__root__base.json",
      "components__root__example-variant-1.json",
      "components__root__example-variant-2.json",
      "test-project__base.json",
      "test-project__example-variant-1.json",
      "test-project__example-variant-2.json",
    ]);

    const filesOnDisk = fs.readdirSync("/ditto");
    filesOnDisk.forEach((file) => {
      filesOnDiskExpected.delete(file);
    });

    expect(filesOnDiskExpected.size).toBe(0);
  });
});
