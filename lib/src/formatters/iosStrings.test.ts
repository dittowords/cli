import IOSStringsFormatter from "./iosStrings";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";
import {
  ExportTextItemsResponse,
  ExportComponentsResponse,
} from "../http/types";
import fetchText from "../http/textItems";
import fetchComponents from "../http/components";
import fetchProjects from "../http/projects";
import fetchVariants from "../http/variants";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";

jest.mock("../http/textItems");
jest.mock("../http/components");
jest.mock("../http/projects");
jest.mock("../http/variants");

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

// fake test class to expose private methods
// @ts-ignore
class TestIOSStringsFormatter extends IOSStringsFormatter {
  public async fetchAPIData() {
    return super.fetchAPIData();
  }

  public transformAPIData(
    data: Parameters<IOSStringsFormatter["transformAPIData"]>[0]
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
}

describe("IOSStringsFormatter", () => {
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

  const createMockComponentsContent = (): ExportComponentsResponse =>
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
    it("should transform text items into IOSStringsOutputFile output files", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestIOSStringsFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

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

      const result = formatter.transformAPIData(data);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(IOSStringsOutputFile);
      expect(result[0].filename).toBe("project1___base");
      expect(result[1]).toBeInstanceOf(IOSStringsOutputFile);
      expect(result[1].filename).toBe("project1___variant1");
    });

    it("should transform components into IOSStringsOutputFile output files", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestIOSStringsFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockComponentsContent = createMockComponentsContent();
      const data = {
        textItemsMap: {},
        componentsMap: {
          base: mockComponentsContent,
          variant1: mockComponentsContent,
        },
      };

      const result = formatter.transformAPIData(data);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(IOSStringsOutputFile);
      expect(result[0].filename).toBe("components___base");
      expect(result[1]).toBeInstanceOf(IOSStringsOutputFile);
      expect(result[1].filename).toBe("components___variant1");
    });
  });
});
