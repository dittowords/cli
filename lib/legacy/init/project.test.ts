const fs = require("fs");
const yaml = require("js-yaml");

import { _testing } from "./project";

const fakeProjectDir = "/";

jest.mock("fs");

describe("saveProject", () => {
  const configFile = "/ditto/config.yml";
  const projectName = "My Amazing Project";
  const projectId = "5f284259ce1d451b2eb2e23c";

  beforeEach(() => {
    _testing.saveProject(configFile, projectName, projectId);
  });

  it("creates a config file with config data", () => {
    const fileContents = fs.readFileSync(configFile, "utf8");
    const data = yaml.load(fileContents);
    expect(data.sources.projects).toBeDefined();
    expect(data.sources.projects[0].name).toEqual(projectName);
    expect(data.sources.projects[0].id).toEqual(projectId);
  });
});
