import { Output } from "../../outputs";
import { ProjectConfigYAML } from "../../services/projectConfig";
import { CommandMetaFlags } from "../../http/types";
import {
  ExportTextItemsResponse,
  ExportComponentsStringResponse,
} from "../../http/types";
import { exportTextItems } from "../../http/textItems";
import { exportComponents } from "../../http/components";
import fetchProjects from "../../http/projects";
import fetchVariants from "../../http/variants";
import generateSwiftDriver from "../../http/cli";
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

const mockExportTextItems = exportTextItems as jest.MockedFunction<
  typeof exportTextItems
>;
const mockExportComponents = exportComponents as jest.MockedFunction<
  typeof exportComponents
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
    data: Parameters<BaseExportFormatter<any>["transformAPIData"]>[0]
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
   * fetchVariants
   ***********************************************************/
  describe("fetchVariants", () => {
    it("should fetch all variants and include base variant if id: all provided", async () => {
      const output = createMockOutput();
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "all" }],
      });

      const mockVariants = [
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
      ];
      mockFetchVariants.mockResolvedValue(mockVariants);
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.variants).toEqual([
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
        { id: "base" },
      ]);
    });

    it("should set only base variant if variants empty", async () => {
      const output = createMockOutput();
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [],
      });

      const mockVariants = [
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
      ];
      mockFetchVariants.mockResolvedValue(mockVariants);
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.variants).toEqual([{ id: "base" }]);
    });

    it("should prioritize outputs configured in output config", async () => {
      const output = createMockOutput({
        variants: [{ id: "afrikaans" }, { id: "swahili" }],
      });
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "spanish" }, { id: "japanese" }],
      });

      const mockVariants = [
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
      ];
      mockFetchVariants.mockResolvedValue(mockVariants);
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.variants).toEqual(output.variants);
    });

    it("should otherwise default to variants configured in project config", async () => {
      const output = createMockOutput();
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "spanish" }, { id: "japanese" }],
      });

      const mockVariants = [
        { id: "variant1", name: "Variant 1" },
        { id: "variant2", name: "Variant 2" },
      ];
      mockFetchVariants.mockResolvedValue(mockVariants);
      // @ts-ignore
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.variants).toEqual(projectConfig.variants);
    });
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
      mockExportTextItems.mockResolvedValue(mockContent);

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
      mockExportTextItems.mockResolvedValue(mockContent);

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

    it("should fetch variants from API when 'all' is specified, including base", async () => {
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
      mockExportTextItems.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchTextItemsMap();

      expect(mockFetchVariants).toHaveBeenCalled();
      expect(result).toEqual({
        project1: {
          base: mockContent,
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
      mockExportTextItems.mockResolvedValue(mockContent);

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
      mockExportComponents.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchComponentsMap();

      expect(result).toEqual({
        variant1: mockContent,
        base: mockContent,
      });

      expect(mockExportComponents).toHaveBeenCalledTimes(2);
    });

    it("should fetch variants from API when 'all' is specified, including base text", async () => {
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
      mockExportComponents.mockResolvedValue(mockContent);

      await formatter.fetchVariants();
      const result = await formatter.fetchComponentsMap();

      expect(mockFetchVariants).toHaveBeenCalled();
      expect(result).toEqual({
        base: mockContent,
        variant1: mockContent,
        variant2: mockContent,
      });
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
      mockExportComponents.mockResolvedValue(mockContent);

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
      expect(mockExportComponents).not.toHaveBeenCalled();
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

      mockExportTextItems.mockResolvedValue(mockTextContent);
      mockExportComponents.mockResolvedValue(mockComponentsContent);

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
        "project1",
        `project1___base`,
        "base",
        mockTextContent
      );
      expect(createOutputSpy).toHaveBeenCalledWith(
        "project1",
        `project1___variant1`,
        "variant1",
        mockTextContent
      );
    });
  });
});
