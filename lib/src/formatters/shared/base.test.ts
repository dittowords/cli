import BaseFormatter from "./base";
import { Output } from "../../outputs";
import { ProjectConfigYAML } from "../../services/projectConfig";
import { CommandMetaFlags, PullFilters } from "../../http/types";
import JSONOutputFile from "./fileTypes/JSONOutputFile";

// fake test class to expose private methods
// @ts-ignore
class TestBaseFormatter extends BaseFormatter<JSONOutputFile, unknown> {
  public generateTextItemPullFilter() {
    return super["generateTextItemPullFilter"]();
  }

  public generateComponentPullFilter() {
    return super["generateComponentPullFilter"]();
  }

  public generateQueryParams(
    requestType: "textItem" | "component",
    filter: PullFilters = {}
  ) {
    return super.generateQueryParams(requestType, filter);
  }
}

describe("BaseFormatter", () => {
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "json",
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
        format: "json",
      },
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  /***********************************************************
   * generateTextItemPullFilter
   ***********************************************************/

  describe("generateTextItemPullFilter", () => {
    it("should use projectConfig projects and variants when output does not override", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filters = formatter.generateTextItemPullFilter();

      expect(filters).toEqual({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "variant1" }],
      });
    });

    it("should override projects with output.projects when provided", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }, { id: "project2" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput({
        projects: [{ id: "project3" }],
      });
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filters = formatter.generateTextItemPullFilter();

      expect(filters).toEqual({
        projects: [{ id: "project3" }],
        variants: [{ id: "variant1" }],
      });
    });

    it("should override variants with output.variants when provided", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput({
        variants: [{ id: "variant2" }, { id: "variant3" }],
      });
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filters = formatter.generateTextItemPullFilter();

      expect(filters).toEqual({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant2" }, { id: "variant3" }],
      });
    });

    it("should override both projects and variants when both are provided in output", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput({
        projects: [{ id: "project2" }],
        variants: [{ id: "variant2" }],
      });
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filters = formatter.generateTextItemPullFilter();

      expect(filters).toEqual({
        projects: [{ id: "project2" }],
        variants: [{ id: "variant2" }],
      });
    });

    it("should handle undefined projects and variants in projectConfig", () => {
      const projectConfig = createMockProjectConfig({
        projects: undefined,
        variants: undefined,
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filters = formatter.generateTextItemPullFilter();

      expect(filters).toEqual({
        projects: undefined,
        variants: undefined,
      });
    });
  });

  /***********************************************************
   * generateComponentPullFilter
   ***********************************************************/
  describe("generateComponentPullFilter", () => {
    const getComponentPullFilters = (
      mockProjectConfig: any,
      mockOutput?: any
    ) => {
      const projectConfig = createMockProjectConfig(mockProjectConfig);
      const output = createMockOutput(mockOutput);
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      return formatter.generateComponentPullFilter();
    };

    it("should use projectConfig components.folders and variants when output is not provided", () => {
      const filters = getComponentPullFilters({
        components: {
          folders: [
            { id: "folder1" },
            { id: "folder2", excludeNestedFolders: true },
          ],
        },
        variants: [{ id: "variant1" }],
      });

      expect(filters).toEqual({
        folders: [
          { id: "folder1" },
          { id: "folder2", excludeNestedFolders: true },
        ],
        variants: [{ id: "variant1" }],
      });
    });

    it("should not include folders when projectConfig.components.folders is undefined", () => {
      const filters = getComponentPullFilters({
        components: {
          folders: undefined,
        },
        variants: [{ id: "variant1" }],
      });

      expect(filters).toEqual({
        variants: [{ id: "variant1" }],
      });
      expect(filters.folders).toBeUndefined();
    });

    it("should override folders with output.components.folders when provided", () => {
      const filters = getComponentPullFilters(
        {
          components: {
            folders: [{ id: "folder1" }],
          },
          variants: [{ id: "variant1" }],
        },
        {
          components: {
            folders: [{ id: "folder2" }],
          },
        }
      );

      expect(filters).toEqual({
        folders: [{ id: "folder2" }],
        variants: [{ id: "variant1" }],
      });
    });

    it("should override variants with output.variants when provided", () => {
      const filters = getComponentPullFilters(
        {
          components: {
            folders: [{ id: "folder1" }],
          },
          variants: [{ id: "variant1" }],
        },
        {
          variants: [{ id: "variant2" }],
        }
      );

      expect(filters).toEqual({
        folders: [{ id: "folder1" }],
        variants: [{ id: "variant2" }],
      });
    });

    it("should override both folders and variants when both are provided in output", () => {
      const filters = getComponentPullFilters(
        {
          components: {
            folders: [{ id: "folder1" }],
          },
          variants: [{ id: "variant1" }],
        },
        {
          components: {
            folders: [{ id: "folder2" }],
          },
          variants: [{ id: "variant2" }],
        }
      );
      expect(filters).toEqual({
        folders: [{ id: "folder2" }],
        variants: [{ id: "variant2" }],
      });
    });

    it("should handle undefined components in projectConfig", () => {
      const filters = getComponentPullFilters({
        components: undefined,
        variants: [{ id: "variant1" }],
      });

      expect(filters).toEqual({
        variants: [{ id: "variant1" }],
      });
      expect(filters.folders).toBeUndefined();
    });
  });

  /***********************************************************
   * generateQueryParams
   ***********************************************************/

  describe("generateQueryParams", () => {
    it("should generate query params for RequestType: textItem", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const params = formatter.generateQueryParams("textItem");

      expect(params.filter).toBeDefined();
      const parsedFilter = JSON.parse(params.filter);
      expect(parsedFilter).toEqual({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
      expect(params.richText).toBeUndefined();
    });

    it("should generate query params for RequestType: component", () => {
      const projectConfig = createMockProjectConfig({
        components: {
          folders: [{ id: "folder1" }],
        },
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const params = formatter.generateQueryParams("component");

      expect(params.filter).toBeDefined();
      const parsedFilter = JSON.parse(params.filter);
      expect(parsedFilter).toEqual({
        folders: [{ id: "folder1" }],
        variants: [{ id: "variant1" }],
      });
      expect(params.richText).toBeUndefined();
    });

    it("should merge additional filter with base filter", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const additionalFilter: PullFilters = {
        projects: [{ id: "project2" }],
      };
      const params = formatter.generateQueryParams(
        "textItem",
        additionalFilter
      );

      expect(params.filter).toBeDefined();
      const parsedFilter = JSON.parse(params.filter);
      expect(parsedFilter).toEqual({
        projects: [{ id: "project2" }], // Additional filter overrides base
        variants: [{ id: "variant1" }],
      });
    });

    it("should include richText from projectConfig when set", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        richText: "html",
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const params = formatter.generateQueryParams("textItem");

      expect(params.richText).toBe("html");
    });

    it("should override projectConfig richText with output richText when both are set", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        richText: false,
      });
      const output = createMockOutput({
        richText: "html",
      });
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const params = formatter.generateQueryParams("textItem");

      expect(params.richText).toBe("html");
    });

    it("should use output richText when only output has richText set", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
      });
      const output = createMockOutput({
        richText: "html",
      });
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const params = formatter.generateQueryParams("textItem");

      expect(params.richText).toBe("html");
    });

    it("should handle empty filter object", () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
      const output = createMockOutput();
      const formatter = new TestBaseFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const params = formatter.generateQueryParams("textItem", undefined);

      expect(params.filter).toBeDefined();
      const parsedFilter = JSON.parse(params.filter);
      expect(parsedFilter).toEqual({
        projects: [{ id: "project1" }],
        variants: [{ id: "variant1" }],
      });
    });
  });
});
