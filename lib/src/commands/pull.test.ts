import { pull } from "./pull";
import getHttpClient from "../http/client";
import appContext from "../utils/appContext";
import { Output } from "../outputs";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

jest.mock("../http/client");

// Create a mock client with a mock 'get' method
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
};

// Make getHttpClient return the mock client
(getHttpClient as jest.Mock).mockReturnValue(mockHttpClient);

/**********************************************************
 * HELPERS
 **********************************************************/
/**
 * A text item or component as it exists in the mocked workspace, before the API renders it.
 * The fake export API below turns these into the `{ developerId: text }` files the real
 * export endpoints return.
 */
type MockEntity = {
  id: string;
  text: string;
  richText: string;
  status: string;
  notes: string;
  tags: string[];
  integrated: boolean;
  variableIds: string[];
  pluralForm: string | null;
  variantId: string | null;
};
type TextItem = MockEntity & { projectId: string };
type Component = MockEntity & { folderId: string | null };

const createMockTextItem = (overrides: Partial<TextItem> = {}): TextItem => ({
  id: "text-1",
  text: "Plain text content",
  richText: "<p>Rich <strong>HTML</strong> content</p>",
  status: "FINAL",
  notes: "",
  tags: [],
  integrated: true,
  variableIds: [],
  pluralForm: null,
  projectId: "project-1",
  variantId: null,
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
  integrated: true,
  variableIds: [],
  pluralForm: null,
  folderId: null,
  variantId: null,
  ...overrides,
});

const createMockVariable = (overrides: any = {}) => ({
  id: "var-1",
  name: "Variable 1",
  type: "string",
  data: {
    example: "variable value",
    fallback: undefined,
  },
  ...overrides,
});

const createMockData = () => {
  // project-1 and project-2 each have at least one base text item
  const baseTextItems = [
    createMockTextItem({
      projectId: "project-1",
      variantId: null,
      id: "text-1",
    }),
    createMockTextItem({
      projectId: "project-1",
      variantId: null,
      id: "text-2",
    }),
    createMockTextItem({
      projectId: "project-2",
      variantId: null,
      id: "text-3",
    }),
  ];

  // project-1 and project-2 each have a variant-a text item
  const variantATextItems = [
    createMockTextItem({
      projectId: "project-1",
      variantId: "variant-a",
      id: "text-4",
    }),
    createMockTextItem({
      projectId: "project-2",
      variantId: "variant-a",
      id: "text-5",
    }),
  ];

  // Only project-1 has variant-b, so only project-1 should get a variant-b file
  const variantBTextItems = [
    createMockTextItem({
      projectId: "project-1",
      variantId: "variant-b",
      id: "text-6",
    }),
    createMockTextItem({
      projectId: "project-1",
      variantId: "variant-b",
      id: "text-7",
    }),
  ];

  const componentsBase = [
    createMockComponent({
      id: "comp-1",
      variantId: null,
      folderId: null,
    }),
    createMockComponent({
      id: "comp-2",
      variantId: null,
      folderId: "folder-1",
    }),
    createMockComponent({
      id: "comp-3",
      variantId: null,
      folderId: "folder-2",
    }),
  ];

  const componentsVariantA = [
    createMockComponent({
      id: "comp-4",
      variantId: "variant-a",
      folderId: null,
    }),
    createMockComponent({
      id: "comp-5",
      variantId: "variant-a",
      folderId: "folder-1",
    }),
  ];

  const componentsVariantB = [
    createMockComponent({
      id: "comp-6",
      variantId: "variant-b",
      folderId: null,
    }),
    createMockComponent({
      id: "comp-7",
      variantId: "variant-b",
      folderId: "folder-1",
    }),
  ];

  return {
    textItems: [...baseTextItems, ...variantATextItems, ...variantBTextItems],
    components: [
      ...componentsBase,
      ...componentsVariantA,
      ...componentsVariantB,
    ],
  };
};

// Helper functions

/**
 * Renders entities the way the real export endpoints do for the JSON formats: rich text when
 * requested, and a `__variables_used` summary when `includeVariableSummary` is set. An empty
 * export stays empty, matching the API (it skips the summary on an empty file).
 */
const renderExport = (entities: MockEntity[], params: any) => {
  const json: Record<string, unknown> = {};
  const variablesUsed = new Set<string>();
  for (const entity of entities) {
    json[entity.id] = params.richText ? entity.richText : entity.text;
    entity.variableIds.forEach((id) => variablesUsed.add(id));
  }
  if (
    params.includeVariableSummary === "true" &&
    Object.keys(json).length > 0
  ) {
    json.__variables_used = [...variablesUsed].sort();
  }
  return json;
};

/**
 * Stands in for the API. The export endpoints filter the fixtures by the requested project and
 * variant, so a test describes its workspace once and every request sees a consistent view.
 */
const setupMocks = ({
  textItems = [],
  components = [],
  variables = [],
}: {
  textItems: TextItem[];
  components?: Component[];
  variables?: any[];
}) => {
  const projects = [...new Set(textItems.map((item) => item.projectId))].map(
    (id) => ({ id, name: id })
  );

  mockHttpClient.get.mockImplementation((url: string, config?: any) => {
    const params = config?.params ?? {};
    const filter = params.filter ? JSON.parse(params.filter) : {};
    const variantId = params.variantId ?? null;

    if (url === "/v2/textItems/export") {
      const projectIds: string[] = (filter.projects ?? []).map(
        (project: { id: string }) => project.id
      );
      return Promise.resolve({
        data: renderExport(
          textItems.filter(
            (item) =>
              projectIds.includes(item.projectId) &&
              item.variantId === variantId
          ),
          params
        ),
      });
    }
    if (url === "/v2/components/export") {
      return Promise.resolve({
        data: renderExport(
          components.filter((component) => component.variantId === variantId),
          params
        ),
      });
    }
    if (url === "/v2/projects") {
      return Promise.resolve({ data: projects });
    }
    if (url === "/v2/variables") {
      return Promise.resolve({ data: variables });
    }
    return Promise.resolve({ data: [] });
  });
};

/** Every request made to an export endpoint, with its filter parsed. */
const exportCalls = (
  endpoint: "/v2/textItems/export" | "/v2/components/export"
) =>
  mockHttpClient.get.mock.calls
    .filter(([url]: [string]) => url === endpoint)
    .map(([, config]: [string, any]) => ({
      ...config.params,
      filter: JSON.parse(config.params.filter),
    }));

const setupExportMocks = ({
  textItems,
  components,
  variables = [],
}: {
  textItems: any;
  components?: any;
  variables?: any[];
}) => {
  mockHttpClient.get.mockImplementation((url: string, config?: any) => {
    if (url.includes("/v2/textItems/export")) {
      return Promise.resolve({
        data: textItems,
      });
    }
    if (url.includes("/v2/variables")) {
      return Promise.resolve({ data: variables });
    }
    if (url.includes("/v2/components/export")) {
      return Promise.resolve({
        data: components,
      });
    }
    return Promise.resolve({ data: [] });
  });
};

const setupSwiftDriverMocks = () => {
  mockHttpClient.post.mockImplementation((url: string, config?: any) => {
    if (url.includes("/v2/cli/swiftDriver")) {
      return Promise.resolve({
        data: "import SwiftUI",
      });
    }
    return Promise.resolve({ data: [] });
  });
};

const parseJsonFile = (filepath: string) => {
  const content = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(content);
};

const assertFileContainsText = (
  filepath: string,
  devId: string,
  expectedText: string
) => {
  const content = parseJsonFile(filepath);
  expect(content[devId]).toBe(expectedText);
};

const assertFilesCreated = (outputDir: string, expectedFiles: string[]) => {
  const actualFiles = fs.readdirSync(outputDir).toSorted();
  expect(actualFiles).toEqual(expectedFiles.toSorted());
};

/**********************************************************
 * E2E Tests
 **********************************************************/

describe("pull command - end-to-end tests", () => {
  // Create a temporary directory for tests
  let testDir: string;
  let outputDir: string;

  // Reset appContext before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Every test starts from an API with no data. clearAllMocks only clears call history, so
    // this also replaces the mock implementation the previous test set up.
    setupMocks({ textItems: [] });

    // Create a fresh temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "ditto-test-"));
    outputDir = path.join(testDir, "output");

    // Reset appContext to a clean state
    appContext.setProjectConfig({
      projects: [],
      outputs: [
        {
          format: "json",
          outDir: outputDir,
        },
      ],
    });
  });

  // Clean up temp directory after each test
  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Rich Text Feature", () => {
    it("should use rich text when configured at base level", async () => {
      // Only create output directory since we're mocking HTTP and setting appContext directly
      fs.mkdirSync(outputDir, { recursive: true });

      const mockTextItem = createMockTextItem();
      const mockComponent = createMockComponent();
      setupMocks({ textItems: [mockTextItem], components: [mockComponent] });

      // Set up appContext - this is what actually drives the test
      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        components: {},
        richText: "html",
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      // Verify rich text content was written
      assertFileContainsText(
        path.join(outputDir, "project-1___base.json"),
        "text-1",
        "<p>Rich <strong>HTML</strong> content</p>"
      );

      assertFileContainsText(
        path.join(outputDir, "components___base.json"),
        "component-1",
        "<p>Rich <strong>HTML</strong> content</p>"
      );
    });

    it("should use plain text when richText is disabled at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      const mockTextItem = createMockTextItem();
      const mockComponent = createMockComponent();
      setupMocks({ textItems: [mockTextItem], components: [mockComponent] });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        richText: "html",
        components: {},
        outputs: [{ format: "json", outDir: outputDir, richText: false }],
      });

      await pull({});

      // Verify plain text content was written despite base config
      assertFileContainsText(
        path.join(outputDir, "project-1___base.json"),
        "text-1",
        "Plain text content"
      );

      assertFileContainsText(
        path.join(outputDir, "components___base.json"),
        "component-1",
        "Plain text content"
      );
    });

    it("should use rich text when enabled only at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      const mockTextItem = createMockTextItem();
      setupMocks({ textItems: [mockTextItem] });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        outputs: [{ format: "json", outDir: outputDir, richText: "html" }],
      });

      await pull({});

      // Verify rich text content was written
      assertFileContainsText(
        path.join(outputDir, "project-1___base.json"),
        "text-1",
        "<p>Rich <strong>HTML</strong> content</p>"
      );
    });
  });

  /**
   * `richText` is resolved once (an output-level value, including `false`, overrides the
   * project-level one) and sent on every export request, so every output configuration has to
   * honor it identically.
   */
  describe("Rich Text Options", () => {
    const jsonContent = { greeting: "Hello" };
    const outputConfigs: [string, Output, string | Record<string, string>][] = [
      ["json", { format: "json" }, jsonContent],
      ["json + i18next", { format: "json", framework: "i18next" }, jsonContent],
      [
        "json + vue-i18n",
        { format: "json", framework: "vue-i18n" },
        jsonContent,
      ],
      ["json + icu", { format: "json", framework: "icu" }, jsonContent],
      ["json_icu (deprecated)", { format: "json_icu" }, jsonContent],
      ["json + arb", { format: "json", framework: "arb" }, jsonContent],
      ["android", { format: "android" }, "<resources/>"],
      ["ios-strings", { format: "ios-strings" }, '"greeting" = "Hello";'],
      ["ios-stringsdict", { format: "ios-stringsdict" }, "<plist/>"],
    ];

    describe.each(outputConfigs)(
      "%s",
      (_label, outputConfig, exportContent) => {
        const richTextParams = async (
          projectRichText: "html" | "html_paragraphs" | undefined,
          outputRichText: "html" | "html_paragraphs" | false | undefined
        ) => {
          fs.mkdirSync(outputDir, { recursive: true });
          setupExportMocks({
            textItems: exportContent,
            components: exportContent,
          });

          appContext.setProjectConfig({
            projects: [{ id: "project-1" }],
            components: {},
            ...(projectRichText && { richText: projectRichText }),
            outputs: [
              {
                ...outputConfig,
                outDir: outputDir,
                ...(outputRichText !== undefined && {
                  richText: outputRichText,
                }),
              },
            ],
          });

          await pull({});

          const calls = [
            ...exportCalls("/v2/textItems/export"),
            ...exportCalls("/v2/components/export"),
          ];
          expect(calls).toHaveLength(2);
          return calls;
        };

        it.each(["html", "html_paragraphs"] as const)(
          "passes richText: %s through on every export request",
          async (richText) => {
            for (const call of await richTextParams(richText, undefined)) {
              expect(call.richText).toBe(richText);
            }
          }
        );

        it("omits the richText param when an output sets richText: false over a project-level value", async () => {
          for (const call of await richTextParams("html", false)) {
            expect(call).not.toHaveProperty("richText");
          }
        });
      }
    );
  });

  /**
   * Empty exports must produce exactly the files they did before the export migration in v5.11.0:
   * - JSON formats only ever created a file when text landed in it, so they write nothing.
   * - Every other format wrote one file per project and variant regardless of content, and
   *   keeps doing so -- skipping them would delete files existing integrations expect.
   */
  describe("Empty exports", () => {
    it.each([
      [{ format: "json" }, "json"],
      [{ format: "json", framework: "i18next" }, "json"],
      [{ format: "json", framework: "vue-i18n" }, "json"],
    ] as const)(
      "%o: writes no data file for an empty export",
      async (outputConfig, extension) => {
        fs.mkdirSync(outputDir, { recursive: true });
        setupExportMocks({ textItems: {}, components: {} });

        appContext.setProjectConfig({
          projects: [{ id: "project-1" }],
          components: {},
          outputs: [{ ...outputConfig, outDir: outputDir }],
        });

        await pull({});

        expect(
          fs.existsSync(path.join(outputDir, `project-1___base.${extension}`))
        ).toBe(false);
        expect(
          fs.existsSync(path.join(outputDir, `components___base.${extension}`))
        ).toBe(false);
        // As before v5.11.0, JSON outputs write variables.json even when it's empty
        expect(parseJsonFile(path.join(outputDir, "variables.json"))).toEqual(
          {}
        );
      }
    );

    it.each([
      [{ format: "json", framework: "icu" }, {}, "json"],
      [{ format: "json_icu" }, {}, "json"],
      [{ format: "json", framework: "arb" }, {}, "arb"],
      [
        { format: "android" },
        '<?xml version="1.0" encoding="utf-8"?>\n<resources/>',
        "xml",
      ],
      [{ format: "ios-strings" }, "", "strings"],
      [{ format: "ios-stringsdict" }, "<plist><dict/></plist>", "stringsdict"],
    ] as const)(
      "%o: still writes a file for an empty export",
      async (outputConfig, emptyContent, extension) => {
        fs.mkdirSync(outputDir, { recursive: true });
        setupExportMocks({ textItems: emptyContent, components: emptyContent });

        appContext.setProjectConfig({
          projects: [{ id: "project-1" }],
          components: {},
          outputs: [{ ...outputConfig, outDir: outputDir }],
        });

        await pull({});

        expect(
          fs.existsSync(path.join(outputDir, `project-1___base.${extension}`))
        ).toBe(true);
        expect(
          fs.existsSync(path.join(outputDir, `components___base.${extension}`))
        ).toBe(true);
      }
    );
  });

  /**
   * Each output requests one rendered file per project and variant, so a config filter becomes
   * one export request per project/variant: the project goes in the filter, and the variant is
   * sent as `variantId` rather than inside the filter.
   */
  describe("Filter Feature", () => {
    const textItemCalls = () => exportCalls("/v2/textItems/export");
    const componentCalls = () => exportCalls("/v2/components/export");

    it("should filter projects when configured at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      expect(textItemCalls().map((call) => call.filter)).toEqual([
        { projects: [{ id: "project-1" }] },
        { projects: [{ id: "project-2" }] },
      ]);
    });

    it("should filter variants at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        variants: [{ id: "variant-a" }, { id: "variant-b" }],
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      expect(textItemCalls().map((call) => call.variantId)).toEqual([
        "variant-a",
        "variant-b",
      ]);
    });

    it("should query components when source field is provided", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {},
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      expect(componentCalls().map((call) => call.filter)).toEqual([{}]);
      expect(textItemCalls()).toEqual([]);
    });

    it("should filter components by folder at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: { folders: [{ id: "folder-1" }] },
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      expect(componentCalls().map((call) => call.filter)).toEqual([
        { folders: [{ id: "folder-1" }] },
      ]);
    });

    it("should filter components by folder and variants at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: { folders: [{ id: "folder-1" }] },
        variants: [{ id: "variant-a" }, { id: "variant-b" }],
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      expect(
        componentCalls().map(({ filter, variantId }) => ({ filter, variantId }))
      ).toEqual([
        { filter: { folders: [{ id: "folder-1" }] }, variantId: "variant-a" },
        { filter: { folders: [{ id: "folder-1" }] }, variantId: "variant-b" },
      ]);
    });

    it("should filter components by folder at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: { folders: [{ id: "folder-1" }] },
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            components: { folders: [{ id: "folder-3" }] },
          },
        ],
      });

      await pull({});

      expect(componentCalls().map((call) => call.filter)).toEqual([
        { folders: [{ id: "folder-3" }] },
      ]);
    });

    it("should filter components by folder and variants at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: { folders: [{ id: "folder-1" }] },
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            components: { folders: [{ id: "folder-3" }] },
            variants: [{ id: "variant-a" }, { id: "variant-b" }],
          },
        ],
      });

      await pull({});

      expect(
        componentCalls().map(({ filter, variantId }) => ({ filter, variantId }))
      ).toEqual([
        { filter: { folders: [{ id: "folder-3" }] }, variantId: "variant-a" },
        { filter: { folders: [{ id: "folder-3" }] }, variantId: "variant-b" },
      ]);
    });

    it("should filter projects at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            projects: [{ id: "project-1" }],
          },
        ],
      });

      await pull({});

      expect(textItemCalls().map((call) => call.filter)).toEqual([
        { projects: [{ id: "project-1" }] },
      ]);
    });

    it("should filter variants at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        variants: [{ id: "variant-a" }, { id: "variant-b" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            variants: [{ id: "variant-a" }],
          },
        ],
      });

      await pull({});

      expect(textItemCalls().map((call) => call.variantId)).toEqual([
        "variant-a",
      ]);
    });

    it("supports the default filter behavior", async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      setupMocks({
        textItems: [
          createMockTextItem({ projectId: "project-1" }),
          createMockTextItem({ projectId: "project-2", id: "text-2" }),
        ],
      });

      appContext.setProjectConfig({
        projects: [],
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      // An empty `projects` filter expands to every project in the workspace
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/projects");
      expect(textItemCalls().map((call) => call.filter)).toEqual([
        { projects: [{ id: "project-1" }] },
        { projects: [{ id: "project-2" }] },
      ]);
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/variables");
      // Components endpoint should not be called if not provided as source field
      expect(componentCalls()).toEqual([]);
    });
  });

  describe("iosLocales Feature", () => {
    let outputOutDir: string;

    beforeEach(() => {
      outputOutDir = path.join(testDir, "output-outDir");
    });

    it("should not add swift file to directory if iosLocales is not configured", async () => {
      fs.mkdirSync(outputOutDir, { recursive: true });
      setupMocks(createMockData());

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        iosLocales: [{ spanish: "es" }],
        outputs: [
          {
            format: "json",
            outDir: outputOutDir,
          },
        ],
      });

      await pull({});

      const actualFiles = fs.readdirSync(outputOutDir).toSorted();
      expect(actualFiles.some((file) => file.includes(".swift"))).toEqual(
        false
      );
    });

    it("should not add swift file to directory if iosLocales configured but no iOS output provided", async () => {
      fs.mkdirSync(outputOutDir, { recursive: true });
      setupMocks(createMockData());

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        iosLocales: [{ spanish: "es" }],
        outputs: [
          {
            format: "json",
            outDir: outputOutDir,
          },
        ],
      });

      await pull({});

      const actualFiles = fs.readdirSync(outputOutDir).toSorted();
      expect(actualFiles.some((file) => file.includes(".swift"))).toEqual(
        false
      );
    });

    it("should add swift file to root directory if iosLocales is configured and an iOS output is provided", async () => {
      fs.mkdirSync(outputOutDir, { recursive: true });
      const { textItems, components } = createMockData();
      setupExportMocks({
        textItems: textItems
          .map((textItem) => `"${textItem.id}" = "${textItem.text}"`)
          .join("\n\n"),
        components: components
          .map((component) => `"${component.id}" = "${component.text}"`)
          .join("\n\n"),
      });
      setupSwiftDriverMocks();

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        iosLocales: [{ spanish: "es" }],
        outputs: [
          {
            format: "ios-strings",
            outDir: outputOutDir,
          },
        ],
      });

      await pull({});

      const actualFiles = fs.readdirSync("ditto").toSorted();
      expect(actualFiles.some((file) => file.includes(".swift"))).toBe(true);

      // should not be in output-specific dir
      const outputDirFiles = fs.readdirSync(outputOutDir).toSorted();
      expect(outputDirFiles.some((file) => file.includes(".swift"))).toBe(
        false
      );
    });
  });

  /**********************************************************
   * OUTPUT TESTS - JSON
   **********************************************************/
  describe("Output files - JSON", () => {
    const expectedJSONFiles = [
      "project-1___base.json",
      "project-1___variant-a.json",
      "project-1___variant-b.json",
      "project-2___base.json",
      "project-2___variant-a.json",
      "components___base.json",
      "components___variant-a.json",
      "components___variant-b.json",
      "variables.json",
    ];

    it("should create output files for each project and variant returned from the API", async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      setupMocks(createMockData());
      appContext.setProjectConfig({
        projects: [],
        components: {},
        variants: [{ id: "base" }, { id: "variant-a" }, { id: "variant-b" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, expectedJSONFiles);
    });

    it("builds variables.json from the variables referenced across every file", async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      const variable = (name: string) =>
        createMockVariable({ id: name, name, data: { example: `${name}!` } });
      setupMocks({
        textItems: [
          createMockTextItem({
            id: "a",
            projectId: "project-1",
            variableIds: ["Age"],
          }),
          createMockTextItem({
            id: "b",
            projectId: "project-2",
            variableIds: ["Name"],
          }),
        ],
        components: [createMockComponent({ variableIds: ["State"] })],
        variables: [
          variable("Age"),
          variable("Name"),
          variable("State"),
          variable("Unused"),
        ],
      });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        components: {},
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull({});

      // Union across both project files and the components file; unreferenced ones left out
      expect(parseJsonFile(path.join(outputDir, "variables.json"))).toEqual({
        Age: { example: "Age!" },
        Name: { example: "Name!" },
        State: { example: "State!" },
      });
      // The summary that produced it is not written into the locale files
      expect(
        parseJsonFile(path.join(outputDir, "project-1___base.json"))
      ).not.toHaveProperty("__variables_used");
    });

    it("should create index.js file when framework: i18next provided", async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      setupMocks(createMockData());

      appContext.setProjectConfig({
        projects: [],
        components: {},
        variants: [{ id: "base" }, { id: "variant-a" }, { id: "variant-b" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            framework: "i18next",
          },
        ],
      });

      await pull({});

      assertFilesCreated(outputDir, [...expectedJSONFiles, "index.js"]);
    });

    it("should create index.js file when framework: vue-i18n provided", async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      setupMocks(createMockData());

      appContext.setProjectConfig({
        projects: [],
        components: {},
        variants: [{ id: "base" }, { id: "variant-a" }, { id: "variant-b" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            framework: "vue-i18n",
          },
        ],
      });

      await pull({});

      assertFilesCreated(outputDir, [...expectedJSONFiles, "index.js"]);
    });
  });

  /**********************************************************
   * OUTPUT TESTS - ios-strings
   **********************************************************/
  describe("Output files - ios-strings", () => {
    it("should create correct output files for each project and variant returned from the API", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {},
        outputs: [
          {
            format: "ios-strings",
            outDir: outputDir,
            projects: [{ id: "project-1" }, { id: "project-2" }],
            variants: [
              { id: "base" },
              { id: "variant-a" },
              { id: "variant-b" },
            ],
          },
        ],
      });
      // create exports like so
      /*
        "this-is-a-ditto-text-item" = "No its not";

        "this-is-a-text-layer-on-figma" = "This is a Ditto text item (LinkedNode)";

        "update-preferences" = "Update preferences";
      */
      const { textItems, components } = createMockData();
      setupExportMocks({
        textItems: textItems
          .map((textItem) => `"${textItem.id}" = "${textItem.text}"`)
          .join("\n\n"),
        components: components
          .map((component) => `"${component.id}" = "${component.text}"`)
          .join("\n\n"),
      });

      await pull({});

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, [
        "project-1___base.strings",
        "project-1___variant-a.strings",
        "project-1___variant-b.strings",
        "project-2___base.strings",
        "project-2___variant-a.strings",
        "project-2___variant-b.strings",
        "components___base.strings",
        "components___variant-a.strings",
        "components___variant-b.strings",
      ]);
    });
  });

  /**********************************************************
   * OUTPUT TESTS - ios-strings
   **********************************************************/
  describe("Output files - ios-stringsdict", () => {
    it("should create correct output files for each project and variant returned from the API", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {},
        outputs: [
          {
            format: "ios-stringsdict",
            outDir: outputDir,
            projects: [{ id: "project-1" }, { id: "project-2" }],
            variants: [
              { id: "base" },
              { id: "variant-a" },
              { id: "variant-b" },
            ],
          },
        ],
      });
      const { textItems, components } = createMockData();
      setupExportMocks({
        // Todo: once we have plurals let's make some real mock data here
        textItems: textItems.join("\n"),
        components: components.join("\n"),
      });

      await pull({});

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, [
        "project-1___base.stringsdict",
        "project-1___variant-a.stringsdict",
        "project-1___variant-b.stringsdict",
        "project-2___base.stringsdict",
        "project-2___variant-a.stringsdict",
        "project-2___variant-b.stringsdict",
        "components___base.stringsdict",
        "components___variant-a.stringsdict",
        "components___variant-b.stringsdict",
      ]);
    });
  });

  /**********************************************************
   * OUTPUT TESTS - ios-strings
   **********************************************************/
  describe("Output files - Android XML", () => {
    it("should create correct output files for each project and variant returned from the API", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {},
        outputs: [
          {
            format: "android",
            outDir: outputDir,
            projects: [{ id: "project-1" }, { id: "project-2" }],
            variants: [
              { id: "base" },
              { id: "variant-a" },
              { id: "variant-b" },
            ],
          },
        ],
      });

      const { textItems, components } = createMockData();
      setupExportMocks({
        textItems: textItems
          .map(
            (ti) =>
              `<string name="${ti.id}" ditto_api_id="${ti.id}">${ti.text}</string>`
          )
          .join("\n"),
        components: components
          .map(
            (cmp) =>
              `<string name="${cmp.id}" ditto_api_id="${cmp.id}">${cmp.text}</string>`
          )
          .join("\n"),
      });

      await pull({});

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, [
        "project-1___base.xml",
        "project-1___variant-a.xml",
        "project-1___variant-b.xml",
        "project-2___base.xml",
        "project-2___variant-a.xml",
        "project-2___variant-b.xml",
        "components___base.xml",
        "components___variant-a.xml",
        "components___variant-b.xml",
      ]);
    });
  });
});
