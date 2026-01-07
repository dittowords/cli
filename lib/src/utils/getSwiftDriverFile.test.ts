import SwiftOutputFile from "../formatters/shared/fileTypes/SwiftOutputFile";
import { ProjectConfigYAML } from "../services/projectConfig";
import generateSwiftDriver from "../http/cli";
import getSwiftDriverFile from "./getSwiftDriverFile";

jest.mock("../http/cli");
jest.mock("./appContext", () => ({
  __esModule: true,
  default: {
    outDir: "/mock/app/context/outDir",
  },
}));

const mockGenerateSwiftDriver = generateSwiftDriver as jest.MockedFunction<
  typeof generateSwiftDriver
>;

/***********************************************************
 * getSwiftDriverFile
 ***********************************************************/
describe("getSwiftDriverFile", () => {
  it("should return Swift driver output file", async () => {
    const projectConfig = {};
    const meta = {};
    const result = await getSwiftDriverFile(
      meta,
      projectConfig as ProjectConfigYAML
    );
    expect(result).toBeInstanceOf(SwiftOutputFile);
    expect(result.filename).toBe("Ditto");
    expect(result.path).toBe("/mock/app/context/outDir");
  });

  it("should return Swift driver output file with projects from projectConfig", async () => {
    const projectConfig = {
      projects: [{ id: "project1" }],
    };
    const meta = {};
    const mockSwiftDriver = "import Foundation\nclass Ditto { }";
    mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

    const result = await getSwiftDriverFile(
      meta,
      projectConfig as ProjectConfigYAML
    );

    expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
      { projects: [{ id: "project1" }] },
      meta
    );
    expect(result).toBeInstanceOf(SwiftOutputFile);
  });

  it("should return Swift driver output file with components folders from projectConfig", async () => {
    const projectConfig = {
      components: {
        folders: [{ id: "folder1" }, { id: "folder2" }],
      },
    };
    const meta = {};
    const mockSwiftDriver = "import Foundation\nclass Ditto { }";
    mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

    const result = await getSwiftDriverFile(
      meta,
      projectConfig as ProjectConfigYAML
    );

    expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
      {
        components: {
          folders: [{ id: "folder1" }, { id: "folder2" }],
        },
        projects: [],
      },
      meta
    );
    expect(result).toBeInstanceOf(SwiftOutputFile);
  });
});
