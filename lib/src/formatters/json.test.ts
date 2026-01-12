import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags, TextItem, Component } from "../http/types";
import { fetchTextItems } from "../http/textItems";
import { fetchComponents } from "../http/components";
import fetchVariables, { Variable } from "../http/variables";
import JSONFormatter from "./json";
import { getFrameworkProcessor } from "./frameworks/json";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";

jest.mock("../http/textItems");
jest.mock("../http/components");
jest.mock("../http/variables");
jest.mock("../utils/appContext", () => ({
  __esModule: true,
  default: {
    outDir: "/mock/app/context/outDir",
  },
}));

jest.mock("./frameworks/json");

const mockGetFrameworkProcessor = getFrameworkProcessor as jest.MockedFunction<
  typeof getFrameworkProcessor
>;

const mockFetchTextItems = fetchTextItems as jest.MockedFunction<
  typeof fetchTextItems
>;
const mockFetchComponents = fetchComponents as jest.MockedFunction<
  typeof fetchComponents
>;
const mockFetchVariables = fetchVariables as jest.MockedFunction<
  typeof fetchVariables
>;

// fake test class to expose private methods
// @ts-ignore
class TestJSONFormatter extends JSONFormatter {
  public async fetchAPIData() {
    return super.fetchAPIData();
  }

  public transformAPIData(
    data: Parameters<JSONFormatter["transformAPIData"]>[0]
  ) {
    return super.transformAPIData(data);
  }

  // Expose private methods for testing
  public transformAPITextEntity(
    textEntity: TextItem | Component,
    variablesById: Record<string, Variable>
  ) {
    return super["transformAPITextEntity"](textEntity, variablesById);
  }

  public async fetchTextItems() {
    return super["fetchTextItems"]();
  }

  public async fetchComponents() {
    return super["fetchComponents"]();
  }

  public async fetchVariables() {
    return super["fetchVariables"]();
  }

  public getOutputFiles() {
    // @ts-ignore
    return this.outputFiles;
  }

  public getVariablesOutputFile() {
    // @ts-ignore
    return this.variablesOutputFile;
  }
}

describe("JSONFormatter", () => {
  // @ts-ignore
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "json",
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
        format: "json",
      },
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  const createMockTextItem = (overrides: Partial<TextItem> = {}): TextItem => ({
    id: "text-1",
    text: "Plain text content",
    richText: "<p>Rich <strong>HTML</strong> content</p>",
    status: "FINAL",
    notes: "",
    tags: [],
    variableIds: [],
    projectId: "project-1",
    variantId: null,
    pluralForm: null,
    ...overrides,
  });

  const createMockComponent = (
    overrides: Partial<Component> = {}
  ): Component => ({
    id: "component-1",
    text: "Plain text content",
    richText: "<p>Rich <strong>HTML</strong> content</p>",
    status: "FINAL",
    notes: "",
    tags: [],
    variableIds: [],
    folderId: null,
    variantId: null,
    pluralForm: null,
    ...overrides,
  });

  const createMockVariable = (overrides: Partial<Variable> = {}): Variable => {
    const base = {
      id: "var-1",
      name: "Variable 1",
      type: "string" as const,
      data: {
        example: "variable value",
        fallback: undefined,
      },
    };
    return { ...base, ...overrides } as Variable;
  };

  const createMockBaseData = () => {
    const mockTextItems = [
      createMockTextItem({
        id: "text-1",
        projectId: "project1",
        variantId: null,
      }),
      createMockTextItem({
        id: "text-2",
        projectId: "project1",
        variantId: null,
      }),
    ];
    const mockComponents = [
      createMockComponent({
        id: "comp-1",
        variantId: null,
      }),
    ];
    const mockVariables: Variable[] = [
      createMockVariable({
        id: "var-1",
        name: "Variable 1",
      }),
      createMockVariable({
        id: "var-2",
        name: "Variable 2",
        type: "number" as const,
        data: {
          example: 42,
        },
      }),
    ];

    return {
      mockTextItems,
      mockComponents,
      mockVariables,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchAPIData", () => {
    it("should fetch text items, components, and variables and combine them", async () => {
      const projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "base" }],
        components: {
          folders: [],
        },
      });
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const { mockTextItems, mockComponents, mockVariables } =
        createMockBaseData();

      mockFetchTextItems.mockResolvedValue(mockTextItems);
      mockFetchComponents.mockResolvedValue(mockComponents);
      mockFetchVariables.mockResolvedValue(mockVariables);

      const fetchTextItemsSpy = jest.spyOn(formatter, "fetchTextItems");
      const fetchComponentsSpy = jest.spyOn(formatter, "fetchComponents");
      const fetchVariablesSpy = jest.spyOn(formatter, "fetchVariables");

      const result = await formatter.fetchAPIData();

      expect(fetchTextItemsSpy).toHaveBeenCalled();
      expect(fetchComponentsSpy).toHaveBeenCalled();
      expect(fetchVariablesSpy).toHaveBeenCalled();
      expect(result).toEqual({
        textItems: mockTextItems,
        components: mockComponents,
        variablesById: {
          "var-1": mockVariables[0],
          "var-2": mockVariables[1],
        },
      });
    });
  });

  describe("transformAPIData", () => {
    it("should invoke transformAPITextEntity for each text item and component", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput();
      // @ts-ignore
      const formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const { mockTextItems, mockComponents, mockVariables } =
        createMockBaseData();

      const transformAPITextEntitySpy = jest.spyOn(
        formatter,
        "transformAPITextEntity"
      );

      formatter.transformAPIData({
        textItems: mockTextItems,
        components: mockComponents,
        variablesById: mockVariables.reduce((acc, variable) => {
          acc[variable.id] = variable;
          return acc;
        }, {} as Record<string, Variable>),
      });

      const mockVariablesById = mockVariables.reduce(
        (acc, variable) => ({ ...acc, [variable.id]: variable }),
        {} as Record<string, Variable>
      );

      expect(transformAPITextEntitySpy).toHaveBeenCalledTimes(
        mockTextItems.length + mockComponents.length
      );
      mockTextItems.forEach((mockTextItem) => {
        expect(transformAPITextEntitySpy).toHaveBeenCalledWith(
          mockTextItem,
          mockVariablesById
        );
      });
      mockComponents.forEach((mockComponent) => {
        expect(transformAPITextEntitySpy).toHaveBeenCalledWith(
          mockComponent,
          mockVariablesById
        );
      });
    });

    it("should call getFrameworkProcessor.process if framework is enabled", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ framework: "i18next" });
      // @ts-ignore
      const formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      mockGetFrameworkProcessor.mockReturnValue({
        process: jest.fn().mockReturnValue(["fakeDriverFile"]),
      } as any);

      formatter.transformAPIData({
        textItems: [],
        components: [],
        variablesById: {},
      });

      expect(mockGetFrameworkProcessor).toHaveBeenCalledWith(output);
      expect(mockGetFrameworkProcessor(output).process).toHaveBeenCalledWith(
        formatter.getOutputFiles()
      );
    });
  });

  describe("transformAPITextEntity", () => {
    let projectConfig: ProjectConfigYAML;
    let output: Output;
    let formatter: TestJSONFormatter;

    beforeEach(() => {
      projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "base" }],
        components: {
          folders: [],
        },
      });
      output = createMockOutput();
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
    });

    it("should write to output file named {projectId}___{variantId}.json if textItem entity", () => {
      const mockFrenchItem = createMockTextItem({ variantId: "french" });
      const mockBaseItem = createMockTextItem();
      formatter.transformAPITextEntity(mockFrenchItem, {});
      formatter.transformAPITextEntity(mockBaseItem, {});

      const baseVariantFile = formatter.getOutputFiles()["project-1___base"];
      const frenchVariantFile =
        formatter.getOutputFiles()["project-1___french"];
      expect(baseVariantFile).toBeInstanceOf(JSONOutputFile);
      expect(baseVariantFile.content[mockBaseItem.id]).toEqual(
        mockBaseItem.text
      );
      expect(frenchVariantFile).toBeInstanceOf(JSONOutputFile);
      expect(frenchVariantFile.content[mockFrenchItem.id]).toEqual(
        mockFrenchItem.text
      );
    });

    it("should write to output file named components___{variantId}.json if component entity", () => {
      const mockSpanishComponent = createMockComponent({
        variantId: "spanish",
      });
      const mockBaseComponent = createMockComponent();
      formatter.transformAPITextEntity(mockSpanishComponent, {});
      formatter.transformAPITextEntity(mockBaseComponent, {});

      const baseVariantFile = formatter.getOutputFiles()["components___base"];
      const spanishVariantFile =
        formatter.getOutputFiles()["components___spanish"];
      expect(baseVariantFile).toBeInstanceOf(JSONOutputFile);
      expect(baseVariantFile.content[mockBaseComponent.id]).toEqual(
        mockBaseComponent.text
      );
      expect(spanishVariantFile).toBeInstanceOf(JSONOutputFile);
      expect(spanishVariantFile.content[mockSpanishComponent.id]).toEqual(
        mockSpanishComponent.text
      );
    });

    it("should write richText to file if output.richText is 'html'", () => {
      output = createMockOutput({ richText: "html" });
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      const mockTextItem = createMockTextItem();
      formatter.transformAPITextEntity(mockTextItem, {});
      expect(
        formatter.getOutputFiles()["project-1___base"].content[mockTextItem.id]
      ).toEqual(mockTextItem.richText);
    });

    it("should write richText to file if projectConfig.richText is 'html'", () => {
      projectConfig = createMockProjectConfig({ richText: "html" });
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      const mockTextItem = createMockTextItem();
      formatter.transformAPITextEntity(mockTextItem, {});
      expect(
        formatter.getOutputFiles()["project-1___base"].content[mockTextItem.id]
      ).toEqual(mockTextItem.richText);
    });

    it("should not write richText to file if projectConfig.richText 'html' is overwritten by output", () => {
      projectConfig = createMockProjectConfig({ richText: "html" });
      output = createMockOutput({ richText: false });
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      const mockTextItem = createMockTextItem();
      formatter.transformAPITextEntity(mockTextItem, {});
      expect(
        formatter.getOutputFiles()["project-1___base"].content[mockTextItem.id]
      ).toEqual(mockTextItem.text);
    });

    it("should concat pluralForm to text item developer ID in file if not null", () => {
      projectConfig = createMockProjectConfig({ richText: "html" });
      output = createMockOutput({ richText: false });
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      const mockTextItem = createMockTextItem({
        pluralForm: "one",
        text: "The {{count}} ring to rule them all",
      });
      formatter.transformAPITextEntity(mockTextItem, {});
      const fileContent =
        formatter.getOutputFiles()["project-1___base"].content;
      expect(fileContent).toHaveProperty(`${mockTextItem.id}_one`);
      expect(fileContent[`${mockTextItem.id}_one`]).toEqual(mockTextItem.text);
      expect(
        formatter.getOutputFiles()["project-1___base"].content
      ).not.toHaveProperty(mockTextItem.id);
    });

    it("should write each variableId to variables.json file", () => {
      const mockVariables = {
        FullName: {
          id: "FullName",
          name: "FullName",
          type: "string" as const,
          data: {
            example: "Frodo Baggins",
            fallback: "User",
          },
        },
      };
      formatter.transformAPITextEntity(
        createMockComponent({
          text: "{{FullName}}'s Account",
          variableIds: ["FullName"],
        }),
        mockVariables
      );

      expect(formatter.getVariablesOutputFile().content["FullName"]).toEqual(
        mockVariables.FullName.data
      );
    });
  });

  describe("fetchTextItems", () => {
    let projectConfig: ProjectConfigYAML;
    let output: Output;
    let formatter: TestJSONFormatter;

    beforeEach(() => {
      projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "base" }],
        statuses: ["FINAL"],
        components: {
          folders: [],
        },
      });
      output = createMockOutput();
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
    });

    it("should return empty array if projects not configured", async () => {
      projectConfig = createMockProjectConfig({
        projects: undefined,
        components: { folders: [] },
      });
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      const result = await formatter.fetchTextItems();
      expect(mockFetchTextItems).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should invoke fetchTextItems http method with correct params", async () => {
      await formatter.fetchTextItems();
      const expectedFilters = {
        projects: projectConfig.projects,
        variants: projectConfig.variants,
        statuses: projectConfig.statuses,
      };
      expect(mockFetchTextItems).toHaveBeenCalledWith(
        {
          filter: JSON.stringify(expectedFilters),
        },
        // @ts-ignore
        formatter.meta
      );
    });
  });

  describe("fetchComponents", () => {
    let projectConfig: ProjectConfigYAML;
    let output: Output;
    let formatter: TestJSONFormatter;

    beforeEach(() => {
      projectConfig = createMockProjectConfig({
        projects: [{ id: "project1" }],
        variants: [{ id: "base" }],
        statuses: ["FINAL"],
        components: {
          folders: [],
        },
      });
      output = createMockOutput();
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
    });

    it("should return empty array if components not configured", async () => {
      projectConfig = createMockProjectConfig({
        components: undefined,
        projects: [],
      });
      formatter = new TestJSONFormatter(
        output,
        projectConfig,
        createMockMeta()
      );
      const result = await formatter.fetchComponents();
      expect(mockFetchComponents).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should invoke fetchComponents http method with correct params", async () => {
      await formatter.fetchComponents();
      const expectedFilters = {
        folders: projectConfig.components?.folders,
        variants: projectConfig.variants,
        statuses: projectConfig.statuses,
      };
      expect(mockFetchComponents).toHaveBeenCalledWith(
        {
          filter: JSON.stringify(expectedFilters),
        },
        // @ts-ignore
        formatter.meta
      );
    });
  });

  describe("fetchVariables", () => {
    it("should invoke fetchVariables with formatter meta", async () => {
      const formatter = new TestJSONFormatter(
        {} as Output,
        {} as ProjectConfigYAML,
        createMockMeta()
      );
      await formatter.fetchVariables();
      // @ts-ignore
      expect(mockFetchVariables).toHaveBeenCalledWith(formatter.meta);
    });
  });
});
