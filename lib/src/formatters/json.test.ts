import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";
import { exportTextItems } from "../http/textItems";
import { exportComponents } from "../http/components";
import fetchVariables, { Variable } from "../http/variables";
import JSONFormatter from "./json";
import JSONVueI18nFormatter from "./jsonVueI18n";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";
import OutputFile from "./shared/fileTypes/OutputFile";

jest.mock("../http/textItems");
jest.mock("../http/components");
jest.mock("../http/projects");
jest.mock("../http/variants");
jest.mock("../http/variables");
jest.mock("../utils/appContext", () => ({
  __esModule: true,
  default: { outDir: "/mock/app/context/outDir" },
}));

const mockExportTextItems = exportTextItems as jest.MockedFunction<
  typeof exportTextItems
>;
const mockExportComponents = exportComponents as jest.MockedFunction<
  typeof exportComponents
>;
const mockFetchVariables = fetchVariables as jest.MockedFunction<
  typeof fetchVariables
>;

// Exposes the protected pipeline so tests can run it without writing to disk
// @ts-ignore
class TestJSONFormatter extends JSONFormatter {
  public getExportFormat() {
    // @ts-ignore
    return this.exportFormat;
  }
  public getOutputFiles(): Record<
    string,
    JSONOutputFile<{ variantId: string }>
  > {
    // @ts-ignore
    return this.outputFiles;
  }
  public async run(): Promise<OutputFile[]> {
    // @ts-ignore
    return this.transformAPIData(await this.fetchAPIData());
  }
}

// @ts-ignore
class TestJSONVueI18nFormatter extends JSONVueI18nFormatter {
  public getExportFormat() {
    // @ts-ignore
    return this.exportFormat;
  }
}

const createMockOutput = (overrides: Partial<Output> = {}): Output =>
  // @ts-ignore
  ({ format: "json", outDir: "/test/output", ...overrides });

const createMockProjectConfig = (
  overrides: Partial<ProjectConfigYAML> = {}
): ProjectConfigYAML => ({
  projects: [{ id: "project-1" }],
  variants: [],
  outputs: [{ format: "json" }],
  ...overrides,
});

const createMockMeta = (): CommandMetaFlags => ({});

const variable = (name: string): Variable => ({
  id: name,
  name,
  type: "string",
  data: { example: `${name}-example` },
});

const findFile = (files: OutputFile[], filename: string) =>
  files.find((file) => file.filename === filename);

describe("JSON formatters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportTextItems.mockResolvedValue({ greeting: "Hello" });
    mockExportComponents.mockResolvedValue({});
    mockFetchVariables.mockResolvedValue([]);
  });

  describe("export format", () => {
    it("uses json_i18next for plain json and i18next", () => {
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig(),
        createMockMeta()
      );
      expect(formatter.getExportFormat()).toBe("json_i18next");
    });

    it("uses json_vue_i18n for vue-i18n", () => {
      const formatter = new TestJSONVueI18nFormatter(
        // @ts-ignore
        createMockOutput({ framework: "vue-i18n" }),
        createMockProjectConfig(),
        createMockMeta()
      );
      expect(formatter.getExportFormat()).toBe("json_vue_i18n");
    });
  });

  describe("request params", () => {
    it("asks every request to omit variant metadata and include the variable summary", async () => {
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig({ components: { folders: [] } }),
        createMockMeta()
      );

      await formatter.run();

      const allParams = [
        ...mockExportTextItems.mock.calls,
        ...mockExportComponents.mock.calls,
      ].map(([params]) => params);
      expect(allParams).toHaveLength(2);
      for (const params of allParams) {
        expect(params).toMatchObject({
          format: "json_i18next",
          excludeVariantMetadata: "true",
          includeVariableSummary: "true",
        });
      }
    });
  });

  describe("output files", () => {
    it("strips __variables_used from the written files", async () => {
      mockExportTextItems.mockResolvedValue({
        greeting: "Hello {{Name}}",
        __variables_used: ["Name"],
      });
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig(),
        createMockMeta()
      );

      await formatter.run();

      expect(formatter.getOutputFiles()["project-1___base"].content).toEqual({
        greeting: "Hello {{Name}}",
      });
    });

    it("skips exports that came back empty", async () => {
      mockExportTextItems.mockResolvedValue({});
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig(),
        createMockMeta()
      );

      await formatter.run();

      expect(formatter.getOutputFiles()).toEqual({});
    });
  });

  describe("variables.json", () => {
    it("contains the union of every file's __variables_used, keyed by id", async () => {
      mockExportTextItems.mockImplementation(
        async (params): Promise<Record<string, string | string[]>> =>
          params.variantId === "french"
            ? { bonjour: "Bonjour {{Name}}", __variables_used: ["Name"] }
            : { hello: "Hi {{Age}}", __variables_used: ["Age"] }
      );
      mockExportComponents.mockResolvedValue({
        shared: "{{State}}",
        __variables_used: ["State"],
      });
      mockFetchVariables.mockResolvedValue([
        variable("Age"),
        variable("Name"),
        variable("State"),
        variable("Unreferenced"),
      ]);

      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig({
          variants: [{ id: "base" }, { id: "french" }],
          components: { folders: [] },
        }),
        createMockMeta()
      );

      const files = await formatter.run();

      expect(findFile(files, "variables")!.content).toEqual({
        Age: { example: "Age-example" },
        Name: { example: "Name-example" },
        State: { example: "State-example" },
      });
    });

    it("fetches all workspace variables once, not per file", async () => {
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig({
          projects: [{ id: "p1" }, { id: "p2" }],
          variants: [{ id: "base" }, { id: "french" }],
        }),
        createMockMeta()
      );

      await formatter.run();

      expect(mockFetchVariables).toHaveBeenCalledTimes(1);
    });

    it("is written empty when no file references a variable", async () => {
      mockFetchVariables.mockResolvedValue([variable("Age")]);
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig(),
        createMockMeta()
      );

      const files = await formatter.run();

      expect(findFile(files, "variables")!.content).toEqual({});
    });
  });

  describe("driver file", () => {
    it("is not generated for plain json", async () => {
      const formatter = new TestJSONFormatter(
        createMockOutput(),
        createMockProjectConfig(),
        createMockMeta()
      );

      const files = await formatter.run();

      expect(findFile(files, "index")).toBeUndefined();
    });

    it("is generated for i18next and spreads each written file", async () => {
      const formatter = new TestJSONFormatter(
        // @ts-ignore
        createMockOutput({ framework: "i18next" }),
        createMockProjectConfig({ components: { folders: [] } }),
        createMockMeta()
      );
      mockExportComponents.mockResolvedValue({ shared: "Shared" });

      const files = await formatter.run();

      const driver = findFile(files, "index")!;
      expect(driver.formattedContent).toContain("...project_1___base");
      expect(driver.formattedContent).toContain("...components___base");
    });

    it.each(["commonjs", "module"])(
      "orders %s imports and spreads by project ID, then components",
      async (type) => {
        const formatter = new TestJSONFormatter(
          // @ts-ignore
          createMockOutput({ framework: "i18next", type }),
          createMockProjectConfig({
            projects: [{ id: "zeta" }, { id: "alpha" }, { id: "mid" }],
            variants: [{ id: "french" }, { id: "base" }],
            components: { folders: [] },
          }),
          createMockMeta()
        );
        mockExportComponents.mockResolvedValue({ shared: "Shared" });

        const files = await formatter.run();

        const content = findFile(files, "index")!.formattedContent;
        const importOrder = [
          ...content.matchAll(/^(?:const|import) (\w+)/gm),
        ].map(([, name]) => name);
        expect(importOrder).toEqual([
          "alpha___base",
          "alpha___french",
          "mid___base",
          "mid___french",
          "zeta___base",
          "zeta___french",
          "components___base",
          "components___french",
        ]);

        const spreadOrder = (variantId: string) => {
          const block = content.match(
            new RegExp(`"${variantId}": \\{([^}]*)\\}`)
          )![1];
          return [...block.matchAll(/\.\.\.(\w+)/g)].map(([, name]) => name);
        };
        expect(spreadOrder("base")).toEqual([
          "alpha___base",
          "mid___base",
          "zeta___base",
          "components___base",
        ]);
        expect(spreadOrder("french")).toEqual([
          "alpha___french",
          "mid___french",
          "zeta___french",
          "components___french",
        ]);
      }
    );
  });
});
