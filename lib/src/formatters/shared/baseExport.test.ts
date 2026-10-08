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
import BaseExportFormatter, {
  ExportFormatAPIData,
  OutputFileSourceKind,
} from "./baseExport";
import IOSStringsOutputFile from "./fileTypes/IOSStringsOutputFile";
import { EXPORT_REQUEST_CONCURRENCY } from "../../utils/concurrency";
import { ExportFormat, PullQueryParams } from "../../http/types";

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

// Test subclass that exposes the protected fetch pipeline
class TestBaseExportFormatter extends BaseExportFormatter<
  IOSStringsOutputFile<{ variantId: string }>
> {
  protected exportFormat: ExportFormat = "ios-strings";

  public createOutputFile(
    filePrefix: string,
    fileName: string,
    variantId: string,
    content: string,
    sourceKind: OutputFileSourceKind
  ) {}
  public extraParams: Partial<PullQueryParams> = {};
  protected exportQueryParams() {
    return this.extraParams;
  }

  public async fetchAPIData() {
    return super.fetchAPIData();
  }

  public transformAPIData(data: ExportFormatAPIData) {
    return super.transformAPIData(data);
  }

  public async fetchVariants() {
    return super.fetchVariants();
  }

  public getVariants() {
    return this.variants;
  }

  public async fetchTextItemsMap() {
    return (await super.fetchAPIData()).textItemsMap;
  }

  public async fetchComponentsMap() {
    return (await super.fetchAPIData()).componentsMap;
  }
}

describe("BaseExportFormatter", () => {
  const createMockOutput = (
    overrides: Partial<Extract<Output, { format: "ios-strings" }>> = {}
  ): Output => ({
    format: "ios-strings",
    outDir: "/test/output",
    ...overrides,
  });

  const createMockProjectConfig = (
    overrides: Partial<ProjectConfigYAML> = {}
  ): ProjectConfigYAML => ({
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
    mockFetchProjects.mockResolvedValue([]);
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
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.getVariants()).toEqual([
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
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.getVariants()).toEqual([{ id: "base" }]);
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
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.getVariants()).toEqual(output.variants);
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
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      await formatter.fetchVariants();
      expect(formatter.getVariants()).toEqual(projectConfig.variants);
    });
  });

  /***********************************************************
   * fetchTextItemsMap
   ***********************************************************/

  describe("text item requests", () => {
    it("should fetch text items for projects and variants configured at root level", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "variant1" }, { id: "base" }],
      });
      const output = createMockOutput();
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
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const mockProjects = [
        { id: "project-1", name: "Project 1", baseId: null },
        { id: "project-2", name: "Project 2", baseId: null },
        { id: "project-3", name: "Project 3", baseId: null },
        { id: "project-4", name: "Project 4", baseId: null },
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
   * text item sources (bases)
   ***********************************************************/
  describe("text item sources", () => {
    const filtersRequested = () =>
      mockExportTextItems.mock.calls.map(([params]) => {
        const { projects, bases } = JSON.parse(params.filter);
        return { projects, bases };
      });

    const runWith = async (overrides: Partial<ProjectConfigYAML>) => {
      const formatter = new TestBaseExportFormatter(
        createMockOutput(),
        createMockProjectConfig({ variants: [{ id: "base" }], ...overrides }),
        createMockMeta()
      );
      mockExportTextItems.mockResolvedValue(createMockIOSStringsContent());
      return formatter.fetchAPIData();
    };

    it("exports a project connected to a configured base together with that base", async () => {
      mockFetchProjects.mockResolvedValue([
        { id: "project1", name: "Project 1", baseId: "base1" },
      ]);

      const { textItemSources, textItemsMap } = await runWith({
        projects: [{ id: "project1" }],
        bases: [{ id: "base1" }],
      });

      expect(textItemSources).toEqual([
        {
          kind: "base",
          id: "base1",
          fetchBaseTextItems: true,
          projectIds: ["project1"],
        },
      ]);
      expect(filtersRequested()).toEqual([
        { projects: [{ id: "project1" }], bases: [{ id: "base1" }] },
      ]);
      expect(Object.keys(textItemsMap)).toEqual(["base1"]);
    });

    it("groups projects sharing an unconfigured base without requesting the base", async () => {
      mockFetchProjects.mockResolvedValue([
        { id: "project1", name: "Project 1", baseId: "base1" },
        { id: "project2", name: "Project 2", baseId: "base1" },
        { id: "project3", name: "Project 3", baseId: null },
      ]);

      const { textItemSources } = await runWith({
        projects: [{ id: "project1" }, { id: "project2" }, { id: "project3" }],
      });

      expect(textItemSources).toEqual([
        {
          kind: "base",
          id: "base1",
          fetchBaseTextItems: false,
          projectIds: ["project1", "project2"],
        },
        { kind: "project", id: "project3" },
      ]);
      expect(filtersRequested()).toEqual([
        { projects: [{ id: "project1" }, { id: "project2" }] },
        { projects: [{ id: "project3" }] },
      ]);
    });

    it("groups every workspace project by base when projects is empty", async () => {
      mockFetchProjects.mockResolvedValue([
        { id: "project1", name: "Project 1", baseId: null },
        { id: "project2", name: "Project 2", baseId: "base1" },
        { id: "project3", name: "Project 3", baseId: "base1" },
      ]);

      const { textItemSources } = await runWith({ projects: [] });

      expect(textItemSources).toEqual([
        {
          kind: "base",
          id: "base1",
          fetchBaseTextItems: false,
          projectIds: ["project2", "project3"],
        },
        { kind: "project", id: "project1" },
      ]);
    });

    it("exports a configured base on its own when none of its projects are configured", async () => {
      const { textItemSources } = await runWith({
        bases: [{ id: "base1" }],
      });

      expect(mockFetchProjects).not.toHaveBeenCalled();
      expect(textItemSources).toEqual([
        {
          kind: "base",
          id: "base1",
          fetchBaseTextItems: true,
          projectIds: [],
        },
      ]);
      expect(filtersRequested()).toEqual([{ bases: [{ id: "base1" }] }]);
    });

    it("prefers output-level bases over project-level bases", async () => {
      const formatter = new TestBaseExportFormatter(
        createMockOutput({ bases: [{ id: "output-base" }] }),
        createMockProjectConfig({
          variants: [{ id: "base" }],
          bases: [{ id: "config-base" }],
        }),
        createMockMeta()
      );
      mockExportTextItems.mockResolvedValue(createMockIOSStringsContent());

      const { textItemSources } = await formatter.fetchAPIData();

      expect(textItemSources.map((source) => source.id)).toEqual([
        "output-base",
      ]);
    });

    it("uses only output-level bases when the top level sets only projects", async () => {
      const formatter = new TestBaseExportFormatter(
        createMockOutput({ bases: [{ id: "output-base" }] }),
        createMockProjectConfig({
          variants: [{ id: "base" }],
          projects: [{ id: "config-project" }],
        }),
        createMockMeta()
      );
      mockExportTextItems.mockResolvedValue(createMockIOSStringsContent());

      const { textItemSources } = await formatter.fetchAPIData();

      expect(mockFetchProjects).not.toHaveBeenCalled();
      expect(textItemSources).toEqual([
        {
          kind: "base",
          id: "output-base",
          fetchBaseTextItems: true,
          projectIds: [],
        },
      ]);
    });

    it("uses only output-level projects when the top level sets only bases", async () => {
      const formatter = new TestBaseExportFormatter(
        createMockOutput({ projects: [{ id: "output-project" }] }),
        createMockProjectConfig({
          variants: [{ id: "base" }],
          bases: [{ id: "config-base" }],
        }),
        createMockMeta()
      );
      mockExportTextItems.mockResolvedValue(createMockIOSStringsContent());

      const { textItemSources } = await formatter.fetchAPIData();

      expect(textItemSources).toEqual([
        { kind: "project", id: "output-project" },
      ]);
    });

    it("makes no text item requests when neither projects nor bases are configured", async () => {
      const { textItemSources } = await runWith({});

      expect(mockFetchProjects).not.toHaveBeenCalled();
      expect(textItemSources).toEqual([]);
      expect(mockExportTextItems).not.toHaveBeenCalled();
    });
  });

  /***********************************************************
   * fetchComponentsMap
   ***********************************************************/
  describe("component requests", () => {
    it("should fetch components for variants configured at root level", async () => {
      const projectConfig = createMockProjectConfig({
        variants: [{ id: "variant1" }, { id: "base" }],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
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

    it("sends folders, statuses, integrated and tags in the component filter", async () => {
      const projectConfig = createMockProjectConfig({
        variants: [{ id: "base" }],
        components: { folders: [{ id: "folder1" }] },
        statuses: ["FINAL"],
        integrated: true,
        tags: { values: ["tag-1"] },
      });
      const formatter = new TestBaseExportFormatter(
        createMockOutput(),
        projectConfig,
        createMockMeta()
      );
      mockExportComponents.mockResolvedValue(createMockComponentsContent());

      await formatter.fetchAPIData();

      const [params] = mockExportComponents.mock.calls[0];
      expect(JSON.parse(params.filter)).toEqual({
        folders: [{ id: "folder1" }],
        statuses: ["FINAL"],
        integrated: true,
        tags: { values: ["tag-1"] },
      });
    });

    it("should return empty object when components not configured", async () => {
      const projectConfig = createMockProjectConfig({
        components: undefined,
      });
      const output = createMockOutput();
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
        textItemSources: [{ kind: "project", id: "project1" }],
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
      const formatter = new TestBaseExportFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const createOutputSpy = jest.spyOn(formatter, "createOutputFile");
      const mockTextContent = createMockIOSStringsContent();
      const data: ExportFormatAPIData = {
        textItemSources: [
          { kind: "project", id: "project1" },
          {
            kind: "base",
            id: "base1",
            fetchBaseTextItems: true,
            projectIds: ["project2"],
          },
        ],
        textItemsMap: {
          project1: {
            base: mockTextContent,
            variant1: mockTextContent,
          },
          base1: {
            base: mockTextContent,
          },
        },
        componentsMap: {
          base: mockTextContent,
        },
      };

      formatter.transformAPIData(data);
      expect(createOutputSpy).toHaveBeenCalledTimes(4);
      expect(createOutputSpy).toHaveBeenCalledWith(
        "project1",
        `project1___base`,
        "base",
        mockTextContent,
        "project"
      );
      expect(createOutputSpy).toHaveBeenCalledWith(
        "project1",
        `project1___variant1`,
        "variant1",
        mockTextContent,
        "project"
      );
      expect(createOutputSpy).toHaveBeenCalledWith(
        "base1",
        `base1___base`,
        "base",
        mockTextContent,
        "base"
      );
      expect(createOutputSpy).toHaveBeenCalledWith(
        "components",
        `components___base`,
        "base",
        mockTextContent,
        "components"
      );
    });
  });

  /***********************************************************
   * request batching
   ***********************************************************/
  describe("request batching", () => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

    it("bounds text item and component requests by one shared limit", async () => {
      // 4 projects x 2 variants + 2 component variants = 10 requests, double the limit
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }],
        variants: [{ id: "base" }, { id: "variant1" }],
        components: { folders: [] },
      });
      const formatter = new TestBaseExportFormatter(
        createMockOutput(),
        projectConfig,
        createMockMeta()
      );

      let inFlight = 0;
      let maxInFlight = 0;
      const trackRequest = async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await tick();
        inFlight--;
        return createMockIOSStringsContent();
      };
      mockExportTextItems.mockImplementation(trackRequest);
      mockExportComponents.mockImplementation(trackRequest);

      await formatter.fetchAPIData();

      expect(mockExportTextItems).toHaveBeenCalledTimes(8);
      expect(mockExportComponents).toHaveBeenCalledTimes(2);
      // Combined, never above the limit -- not the limit per entity type
      expect(maxInFlight).toBe(EXPORT_REQUEST_CONCURRENCY);
    });

    it("assembles the maps in request order, not completion order", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "slow" }, { id: "fast" }],
        variants: [{ id: "base" }],
        components: undefined,
      });
      const formatter = new TestBaseExportFormatter(
        createMockOutput(),
        projectConfig,
        createMockMeta()
      );

      mockExportTextItems.mockImplementation(async (params) => {
        const projectId = JSON.parse(params.filter).projects[0].id;
        await new Promise((r) => setTimeout(r, projectId === "slow" ? 20 : 0));
        return projectId;
      });

      const { textItemsMap } = await formatter.fetchAPIData();

      expect(Object.keys(textItemsMap)).toEqual(["slow", "fast"]);
    });

    it("adds the format's exportQueryParams to every request", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "p1" }],
        variants: [{ id: "base" }, { id: "variant1" }],
        components: { folders: [] },
      });
      const formatter = new TestBaseExportFormatter(
        createMockOutput(),
        projectConfig,
        createMockMeta()
      );
      formatter.extraParams = { excludeVariantMetadata: "true" };
      mockExportTextItems.mockResolvedValue(createMockIOSStringsContent());
      mockExportComponents.mockResolvedValue(createMockComponentsContent());

      await formatter.fetchAPIData();

      const allParams = [
        ...mockExportTextItems.mock.calls,
        ...mockExportComponents.mock.calls,
      ].map(([params]) => params);
      expect(allParams).toHaveLength(4);
      for (const params of allParams) {
        expect(params.excludeVariantMetadata).toBe("true");
      }
    });
  });
});
