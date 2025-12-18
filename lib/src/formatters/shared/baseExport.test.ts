import { Output } from "../../outputs";
import { ProjectConfigYAML } from "../../services/projectConfig";
import { CommandMetaFlags } from "../../http/types";
import {
  ExportTextItemsResponse,
  ExportComponentsStringResponse,
} from "../../http/types";
import fetchText from "../../http/textItems";
import fetchComponents from "../../http/components";
import fetchProjects from "../../http/projects";
import fetchVariants from "../../http/variants";
import generateSwiftDriver from "../../http/cli";
import appContext from "../../utils/appContext";
import BaseExportFormatter from "./baseExport";

jest.mock("../../http/textItems");
jest.mock("../../http/components");
jest.mock("../../http/projects");
jest.mock("../../http/variants");
jest.mock("../../http/cli");
jest.mock("../../utils/appContext", () => ({
  __esModule: true,
  default: {
    outDir: "/mock/app/context/outDir",
  },
}));

const mockFetchText = fetchText as jest.MockedFunction<typeof fetchText>;
const mockFetchComponents = fetchComponents as jest.MockedFunction<
  typeof fetchComponents
>;
const mockFetchProjects = fetchProjects as jest.MockedFunction<
  typeof fetchProjects
>;
const mockFetchVariants = fetchVariants as jest.MockedFunction<
  typeof fetchVariants
>;
const mockGenerateSwiftDriver = generateSwiftDriver as jest.MockedFunction<
  typeof generateSwiftDriver
>;

// fake test class to expose private methods
// @ts-ignore
class TestBaseExportFormatter extends BaseExportFormatter {
  public createOutputFile(
    fileName: string,
    variantId: string,
    content: string
  ) {}
  public async fetchAPIData() {
    return super.fetchAPIData();
  }

  public transformAPIData(
    data: Parameters<BaseExportFormatter<any, any, any>["transformAPIData"]>[0]
  ) {
    return super.transformAPIData(data);
  }

  public async fetchVariants() {
    return super["fetchVariants"]();
  }

  // Expose private methods for testing
  public async fetchTextItemsMap() {
    return super["fetchTextItemsMap"]();
  }

  public async fetchComponentsMap() {
    return super["fetchComponentsMap"]();
  }

  public getLocalesPath(variantId: string) {
    return super.getLocalesPath(variantId);
  }

  public async getSwiftDriverFile() {
    return super.getSwiftDriverFile();
  }
}

describe("BaseExportFormatter", () => {
  // @ts-ignore
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "ios-strings",
    outDir: "/test/output",
    ...overrides,
  });

  const createMockProjectConfig = (
    overrides: Partial<ProjectConfigYAML> = {}
  ): ProjectConfigYAML => ({
    projects: [],
    variants: [],
    components: {
      folders: [],
    },
    outputs: [
      {
        format: "ios-strings",
      },
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  const createMockIOSStringsContent = (): ExportTextItemsResponse =>
    `
    "this-is-a-ditto-text-item" = "No its not";

    "this-is-a-text-layer-on-figma" = "This is a Ditto text item (LinkedNode)";

    "update-preferences" = "Update preferences";
  `;

  const createMockComponentsContent = (): ExportComponentsStringResponse =>
    `
    "continue" = "Continue";

    "email" = "Email";
    `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /***********************************************************
   * fetchTextItemsMap
   ***********************************************************/

  describe("fetchTextItemsMap", () => {
    it("should fetch text items for projects and variants configured at root level", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "variant1" }, { id: "base" }],
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockContent = createMockIOSStringsContent();
      mockFetchText.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchTextItemsMap();

      expect(result).toEqual({
        project1: {
          variant1: mockContent,
          base: mockContent,
        },
        project2: {
          variant1: mockContent,
          base: mockContent,
        },
      });
    });

    it("should fetch all projects from API when not configured", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [],
        variants: [{ id: "base" }],
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockProjects = [
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
        { id: "project-3", name: "Project 3" },
        { id: "project-4", name: "Project 4" },
      ];
      const mockContent = createMockIOSStringsContent();

      mockFetchProjects.mockResolvedValue(mockProjects);
      mockFetchText.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchTextItemsMap();

      expect(mockFetchProjects).toHaveBeenCalled();
      expect(result).toEqual({
        "project-1": {
          base: mockContent,
        },
        "project-2": {
          base: mockContent,
        },
        "project-3": {
          base: mockContent,
        },
        "project-4": {
          base: mockContent,
        },
      });
    });

    it("should fetch variants from API when 'all' is specified", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "all" }],
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockVariants = [
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
      ];
      const mockContent = createMockIOSStringsContent();

      mockFetchVariants.mockResolvedValue(mockVariants);
      mockFetchText.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchTextItemsMap();

      expect(mockFetchVariants).toHaveBeenCalled();
      expect(result).toEqual({
        project1: {
          variant1: mockContent,
          variant2: mockContent,
        },
      });
    });

    it("should default to base variant when variants are empty", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [],
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockContent = createMockIOSStringsContent();
      mockFetchText.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchTextItemsMap();

      expect(result).toEqual({
        project1: {
          base: mockContent,
        },
      });
    });
  });

  /***********************************************************
   * fetchComponentsMap
   ***********************************************************/
  describe("fetchComponentsMap", () => {
    it("should fetch components for variants configured at root level", async () => {
      const projectConfig = createMockProjectConfig({
        variants: [{ id: "variant1" }, { id: "base" }],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockContent = createMockComponentsContent();
      mockFetchComponents.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchComponentsMap();

      expect(result).toEqual({
        variant1: mockContent,
        base: mockContent,
      });

      expect(mockFetchComponents).toHaveBeenCalledTimes(2);
    });

    it("should fetch variants from API when 'all' is specified", async () => {
      const projectConfig = createMockProjectConfig({
        variants: [{ id: "all" }],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockVariants = [
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
      ];
      const mockContent = createMockComponentsContent();

      mockFetchVariants.mockResolvedValue(mockVariants);
      mockFetchComponents.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchComponentsMap();

      expect(mockFetchVariants).toHaveBeenCalled();
      expect(result).toEqual({ variant1: mockContent, variant2: mockContent });
    });

    it("should default to base variant when variants are empty", async () => {
      const projectConfig = createMockProjectConfig({
        variants: [],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockContent = createMockComponentsContent();
      mockFetchComponents.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchComponentsMap();

      expect(result).toEqual({
        base: mockContent,
      });
    });

    it("should return empty object when components not configured", async () => {
      const projectConfig = createMockProjectConfig({
        components: undefined,
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = await formatter.fetchComponentsMap();

      expect(result).toEqual({});
      expect(mockFetchComponents).not.toHaveBeenCalled();
    });
  });

  /***********************************************************
   * fetchAPIData
   ***********************************************************/
  describe("fetchAPIData", () => {
    it("should fetchVariants and combine text items and components data", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "base" }],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockTextContent = createMockIOSStringsContent();
      const mockComponentsContent = createMockComponentsContent();

      mockFetchText.mockResolvedValue(mockTextContent);
      mockFetchComponents.mockResolvedValue(mockComponentsContent);

      const fetchVariantsSpy = jest.spyOn(formatter, "fetchVariants");
      const result = await formatter.fetchAPIData();

      expect(fetchVariantsSpy).toHaveBeenCalled();
      expect(result).toEqual({
        textItemsMap: {
          project1: {
            base: mockTextContent,
          },
        },
        componentsMap: {
          base: mockComponentsContent,
        },
      });
    });
  });

  /***********************************************************
   * transformAPIData
   ***********************************************************/
  describe("transformAPIData", () => {
    it("should invoke BaseExportFormatter.createOutputFiles for each text item", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const createOutputSpy = jest.spyOn(formatter, "createOutputFile");
      const mockTextContent = createMockIOSStringsContent();
      const data = {
        textItemsMap: {
          project1: {
            base: mockTextContent,
            variant1: mockTextContent,
          },
        },
        componentsMap: {},
      };

      formatter.transformAPIData(data);
      expect(createOutputSpy).toHaveBeenCalledTimes(2);
      expect(createOutputSpy).toHaveBeenCalledWith(
        `project1___base`,
        "base",
        mockTextContent
      );
      expect(createOutputSpy).toHaveBeenCalledWith(
        `project1___variant1`,
        "variant1",
        mockTextContent
      );
    });
  });

  /***********************************************************
   * getLocalesPath
   ***********************************************************/
  describe("getLocalesPath", () => {
    it("should return output outDir when iosLocales is not configured", () => {
      const projectConfig = createMockProjectConfig({
        iosLocales: undefined,
      });
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = formatter.getLocalesPath("base");

      expect(result).toBe("/test/output");
    });

    it("should return locale path when iosLocales is configured and variantId matches", () => {
      const projectConfig = createMockProjectConfig({
        iosLocales: [{ base: "en" }, { variant1: "es" }, { variant2: "fr" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = formatter.getLocalesPath("variant1");

      expect(result).toBe("/mock/app/context/outDir/es.lproj");
    });

    it("should return output's outDir when iosLocales is configured but variantId does not exist in iosLocales map", () => {
      const projectConfig = createMockProjectConfig({
        iosLocales: [{ base: "en" }, { variant1: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = formatter.getLocalesPath("variant2");

      expect(result).toBe("/test/output");
    });

    it("should return locale path for base variant when configured", () => {
      const projectConfig = createMockProjectConfig({
        iosLocales: [{ base: "en" }, { variant1: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = formatter.getLocalesPath("base");

      expect(result).toBe("/mock/app/context/outDir/en.lproj");
    });
  });

  /***********************************************************
   * getSwiftDriverFile
   ***********************************************************/
  describe("getSwiftDriverFile", () => {
    it("should generate Swift driver file with components folders from projectConfig", async () => {
      const projectConfig = createMockProjectConfig({
        components: {
          folders: [{ id: "folder1" }, { id: "folder2" }],
        },
        projects: [{ id: "project1" }],
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockSwiftDriver = "import Foundation\nclass Ditto { }";
      mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

      const result = await formatter.getSwiftDriverFile();

      expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
        {
          components: {
            folders: [{ id: "folder1" }, { id: "folder2" }],
          },
          projects: [{ id: "project1" }],
        },
        {}
      );
      expect(result.filename).toBe("Ditto");
      expect(result.path).toBe("/mock/app/context/outDir");
      expect(result.content).toBe(mockSwiftDriver);
    });

    it("should generate Swift driver file with components folders from output", async () => {
      const projectConfig = createMockProjectConfig({
        components: {
          folders: [{ id: "config-folder" }],
        },
      });
      const output = createMockOutput({
        components: {
          folders: [{ id: "output-folder1" }, { id: "output-folder2" }],
        },
      });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockSwiftDriver = "import Foundation\nclass Ditto { }";
      mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

      const result = await formatter.getSwiftDriverFile();

      expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
        {
          components: {
            folders: [{ id: "output-folder1" }, { id: "output-folder2" }],
          },
          projects: [],
        },
        {}
      );
      expect(result.filename).toBe("Ditto");
      expect(result.path).toBe("/mock/app/context/outDir");
      expect(result.content).toBe(mockSwiftDriver);
    });

    it("should generate Swift driver file with projects from output", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "config-project" }],
        components: undefined,
      });
      const output = createMockOutput({
        projects: [{ id: "output-project1" }, { id: "output-project2" }],
      });
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockSwiftDriver = "import Foundation\nclass Ditto { }";
      mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

      const result = await formatter.getSwiftDriverFile();

      expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
        {
          projects: [{ id: "output-project1" }, { id: "output-project2" }],
        },
        {}
      );
      expect(result.filename).toBe("Ditto");
      expect(result.path).toBe("/mock/app/context/outDir");
    });

    it("should generate Swift driver file with empty projects array when not configured", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockSwiftDriver = "import Foundation\nclass Ditto { }";
      mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

      const result = await formatter.getSwiftDriverFile();

      expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
        {
          projects: [],
          components: {
            folders: [],
          },
        },
        {}
      );
      expect(result.filename).toBe("Ditto");
      expect(result.path).toBe("/mock/app/context/outDir");
    });

    it("should not include components in filters when components not configured", async () => {
      const projectConfig = createMockProjectConfig({
        components: undefined,
        projects: [{ id: "project1" }],
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockSwiftDriver = "import Foundation\nclass Ditto { }";
      mockGenerateSwiftDriver.mockResolvedValue(mockSwiftDriver);

      await formatter.getSwiftDriverFile();

      expect(mockGenerateSwiftDriver).toHaveBeenCalledWith(
        {
          projects: [{ id: "project1" }],
        },
        {}
      );
    });
  });
});
