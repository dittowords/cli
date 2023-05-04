import fs from "fs";
import path from "path";
import { createApiClient } from "./api";

const testProjects = [
  {
    id: "1",
    name: "Project 1",
    fileName: "Project 1",
  },
  { id: "2", name: "Project 2", fileName: "Project 2" },
];

jest.mock("./api");

const mockApi = createApiClient() as jest.Mocked<
  ReturnType<typeof createApiClient>
>;

jest.mock("./consts", () => ({
  TEXT_DIR: ".testing",
  API_HOST: "https://api.dittowords.com",
  CONFIG_FILE: ".testing/ditto",
  PROJECT_CONFIG_FILE: ".testing/config.yml",
  TEXT_FILE: ".testing/text.json",
}));

import consts from "./consts";
import allPull from "./pull";

const {
  _testing: { cleanOutputFiles, downloadAndSaveVariant, downloadAndSaveBase },
} = allPull;
const variant = "english";

const cleanOutputDir = () => {
  if (fs.existsSync(consts.TEXT_DIR))
    fs.rmSync(consts.TEXT_DIR, { recursive: true, force: true });

  fs.mkdirSync(consts.TEXT_DIR);
};

afterAll(() => {
  fs.rmSync(consts.TEXT_DIR, { force: true, recursive: true });
});

describe("cleanOutputFiles", () => {
  it("removes .js, .json, .xml, and .strings files", () => {
    cleanOutputDir();

    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.json"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.js"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.xml"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.strings"), "test");
    // this file shouldn't be deleted
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.txt"), "test");

    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(5);

    cleanOutputFiles();

    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });
});

// describe("downloadAndSaveVariant", () => {
//   beforeAll(() => {
//     if (!fs.existsSync(consts.TEXT_DIR)) {
//       fs.mkdirSync(consts.TEXT_DIR);
//     }
//   });

//   it("writes a single file for default format", async () => {
//     cleanOutputDir();

//     const output = await downloadAndSaveVariant(variant, testProjects, "");
//     expect(/saved to.*english\.json/.test(output)).toEqual(true);
//     expect(output.match(/saved to/g)?.length).toEqual(1);
//     expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
//   });

//   it("writes multiple files for flat format", async () => {
//     cleanOutputDir();

//     const output = await downloadAndSaveVariant(variant, testProjects, "flat");

//     expect(/saved to.*Project 1__english\.json/.test(output)).toEqual(true);
//     expect(/saved to.*Project 2__english\.json/.test(output)).toEqual(true);
//     expect(output.match(/saved to/g)?.length).toEqual(2);
//     expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
//   });

//   it("writes multiple files for structured format", async () => {
//     cleanOutputDir();

//     const output = await downloadAndSaveVariant(
//       variant,
//       testProjects,
//       "structured"
//     );

//     expect(/saved to.*Project 1__english\.json/.test(output)).toEqual(true);
//     expect(/saved to.*Project 2__english\.json/.test(output)).toEqual(true);
//     expect(output.match(/saved to/g)?.length).toEqual(2);
//     expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
//   });
// });

describe("downloadAndSaveBase", () => {
  beforeAll(() => {
    if (!fs.existsSync(consts.TEXT_DIR)) {
      fs.mkdirSync(consts.TEXT_DIR);
    }
  });

  it("writes to text.json for default format", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValueOnce({ data: [] });
    const output = await downloadAndSaveBase(
      testProjects,
      "" as any,
      undefined
    );

    expect(/saved to.*text\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(1);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });

  it("writes multiple files for flat format", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: [] });
    const output = await downloadAndSaveBase(testProjects, "flat", undefined);
    expect(/saved to.*Project 1\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes multiple files for structured format", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: [] });
    const output = await downloadAndSaveBase(
      testProjects,
      "structured",
      undefined
    );

    expect(/saved to.*Project 1\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes .xml files for android", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: "hello" });
    const output = await downloadAndSaveBase(
      testProjects,
      "android",
      undefined
    );

    expect(/saved to.*Project 1\.xml/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.xml/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes .strings files for ios-strings", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: "hello" });
    const output = await downloadAndSaveBase(
      testProjects,
      "ios-strings",
      undefined
    );

    expect(/saved to.*Project 1\.strings/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.strings/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });
});
