const fs = require("fs");
const path = require("path");

const rewire = require("rewire");
const yaml = require("js-yaml");
const { createFileIfMissing } = require("../config");

const project = rewire("./project");

const { needsProject } = project;

const saveProject = project.__get__("saveProject");
const parseResponse = project.__get__("parseResponse");

const fakeProjectDir = path.join(__dirname, "../../testing/tmp");
const badYaml = path.join(__dirname, "../../testing/fixtures/bad-yaml.yml");
const configEmptyProjects = path.join(
  __dirname,
  "../../testing/fixtures/bad-yaml.yml"
);
const configMissingName = path.join(
  __dirname,
  "../../testing/fixtures/project-config-no-name.yml"
);
const configMissingId = path.join(
  __dirname,
  "../../testing/fixtures/project-config-no-id.yml"
);
const configLegit = path.join(
  __dirname,
  "../../testing/fixtures/project-config-working.yml"
);

describe("saveProject", () => {
  const configFile = path.join(fakeProjectDir, "ditto/config.yml");
  const projectName = "My Amazing Project";
  const projectId = "5f284259ce1d451b2eb2e23c";

  beforeEach(() => {
    if (!fs.existsSync(fakeProjectDir)) fs.mkdirSync(fakeProjectDir);
    saveProject(configFile, projectName, projectId);
  });

  afterEach(() => {
    fs.rmdirSync(fakeProjectDir, { recursive: true });
  });

  it("creates a config file with config data", () => {
    const fileContents = fs.readFileSync(configFile, "utf8");
    const data = yaml.safeLoad(fileContents);
    expect(data.projects).toBeDefined();
    expect(data.projects[0].name).toEqual(projectName);
    expect(data.projects[0].id).toEqual(projectId);
  });
});

describe("needsProject()", () => {
  const configFile = path.join(fakeProjectDir, "ditto/config.yml");
  it("is true if there is no existing config file", () => {
    expect(needsProject(configFile)).toBeTruthy();
  });

  describe("with a file that exists", () => {
    beforeEach(() => {
      if (!fs.existsSync(fakeProjectDir)) fs.mkdirSync(fakeProjectDir);
      createFileIfMissing(configFile);
    });

    it("is true if the file has no projects", () => {
      expect(needsProject(configFile)).toBeTruthy();
    });

    it.each([
      ["the file is bad yaml", badYaml],
      ["no entries exist under projects", configEmptyProjects],
      ["an entry exists without a name", configMissingName],
      ["an entry exists without an id", configMissingId],
    ])("is true if %s", (_msg, file) => {
      expect(fs.existsSync(file)).toBeTruthy();
      expect(needsProject(file)).toBeTruthy();
    });

    it("is false if a file exists with a propper project", () => {
      expect(fs.existsSync(configLegit)).toBeTruthy();
      expect(needsProject(configLegit)).toBeFalsy();
    });
  });
});

describe("parseResponse", () => {
  const result =
    "Large file test [90mhttp://localhost:3000/doc/5ea120d8b56b315ffddb0ef8[39m";
  it("returns the id, name for a project result", () => {
    expect(parseResponse(result)).toEqual({
      id: "5ea120d8b56b315ffddb0ef8",
      name: "Large file test",
    });
  });
});
