const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const api = require("./api");

const rewire = require("rewire");
const rewireConfig = rewire("./config");
rewireConfig.__set__("readData", () => {
  const fileContents = fs.readFileSync(file, "utf8");
  return yaml.safeLoad(fileContents) || defaultData;
});

jest.mock("./api");
api.default.get.mockResolvedValue({ data: [] });

jest.mock("./consts", () => ({
  TEXT_DIR: ".testing",
  API_HOST: "https://api.dittowords.com",
  CONFIG_FILE: ".testing/ditto",
  PROJECT_CONFIG_FILE: ".testing/config.yml",
  TEXT_FILE: ".testing/text.json",
  TEXT_DIR: ".testing",
}));

const consts = require("./consts");
const {
  pull,
  _testing: {
    cleanOutputFiles,
    getProjectsWithDedupedNames,
    downloadAndSaveVariant,
    downloadAndSaveBase,
  },
} = require("./pull");

const testProjects = [
  {
    id: 1,
    name: "Project 1",
  },
  { id: 2, name: "Project 2" },
];
const variant = "english";

const cleanOutputDir = () => {
  if (fs.existsSync(consts.TEXT_DIR))
    fs.rmdirSync(consts.TEXT_DIR, { force: true, recursive: true });

  fs.mkdirSync(consts.TEXT_DIR);
};

afterAll(() => {
  fs.rmdirSync(consts.TEXT_DIR, { force: true, recursive: true });
});

describe("cleanOutputFiles", () => {
  it("removes .js and .json files", () => {
    cleanOutputDir();

    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.json"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.js"), "test");
    // this file shouldn't be deleted
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.txt"), "test");

    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(3);

    cleanOutputFiles();

    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });
});

describe("getProjectsWithDedupedNames", () => {
  it("dedupes projects with the same name", () => {
    const projects = [
      { id: 1, name: "project" },
      { id: 2, name: "project" },
      { id: 3, name: "project" },
      { id: 4, name: "project-other" },
    ];

    expect(getProjectsWithDedupedNames(projects)).toEqual([
      { id: 1, name: "project" },
      { id: 2, name: "project-1" },
      { id: 3, name: "project-2" },
      { id: 4, name: "project-other" },
    ]);
  });
});

describe("downloadAndSaveVariant", () => {
  beforeAll(() => {
    if (!fs.existsSync(consts.TEXT_DIR)) {
      fs.mkdirSync(consts.TEXT_DIR);
    }
  });

  it("writes a single file for default format", async () => {
    cleanOutputDir();

    const output = await downloadAndSaveVariant(variant, testProjects);

    expect(/saved to.*english\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g).length).toEqual(1);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });

  it("writes multiple files for flat format", async () => {
    cleanOutputDir();

    const output = await downloadAndSaveVariant(variant, testProjects, "flat");

    expect(/saved to.*Project 1__english\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2__english\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g).length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes multiple files for structured format", async () => {
    cleanOutputDir();

    const output = await downloadAndSaveVariant(
      variant,
      testProjects,
      "structured"
    );

    expect(/saved to.*Project 1__english\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2__english\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g).length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });
});

describe("downloadAndSaveBase", () => {
  beforeAll(() => {
    if (!fs.existsSync(consts.TEXT_DIR)) {
      fs.mkdirSync(consts.TEXT_DIR);
    }
  });

  it("writes to text.json for default format", async () => {
    cleanOutputDir();

    const output = await downloadAndSaveBase(testProjects);

    expect(/saved to.*text\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g).length).toEqual(1);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });

  it("writes multiple files for flat format", async () => {
    cleanOutputDir();

    const output = await downloadAndSaveBase(testProjects, "flat");

    expect(/saved to.*Project 1\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g).length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes multiple files for structured format", async () => {
    cleanOutputDir();

    const output = await downloadAndSaveBase(testProjects, "structured");

    expect(/saved to.*Project 1\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g).length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });
});
