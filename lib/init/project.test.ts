const fs = require("fs");
const path = require("path");

const yaml = require("js-yaml");
const { createFileIfMissing } = require("../config");

import { _testing } from "./project";

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
    _testing.saveProject(configFile, projectName, projectId);
  });

  afterEach(() => {
    fs.rmdirSync(fakeProjectDir, { recursive: true });
  });

  it("creates a config file with config data", () => {
    const fileContents = fs.readFileSync(configFile, "utf8");
    const data = yaml.load(fileContents);
    expect(data.sources.projects).toBeDefined();
    expect(data.sources.projects[0].name).toEqual(projectName);
    expect(data.sources.projects[0].id).toEqual(projectId);
  });
});
