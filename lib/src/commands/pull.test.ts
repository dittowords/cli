import { pull } from "./pull";
import getHttpClient from "../http/client";
import { Component, TextItem } from "../http/types";
import appContext from "../utils/appContext";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

jest.mock("../http/client");

// Create a mock client with a mock 'get' method
const mockHttpClient = {
  get: jest.fn(),
};

// Make getHttpClient return the mock client
(getHttpClient as jest.Mock).mockReturnValue(mockHttpClient);

// Test data factories
const createMockTextItem = (overrides: Partial<TextItem> = {}) => ({
  id: "text-1",
  text: "Plain text content",
  richText: "<p>Rich <strong>HTML</strong> content</p>",
  status: "active",
  notes: "",
  tags: [],
  variableIds: [],
  projectId: "project-1",
  variantId: null,
  ...overrides,
});

const createMockComponent = (overrides: Partial<Component> = {}) => ({
  id: "component-1",
  text: "Plain text content",
  richText: "<p>Rich <strong>HTML</strong> content</p>",
  status: "active",
  notes: "",
  tags: [],
  variableIds: [],
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

// Helper functions
const setupMocks = ({
  textItems = [],
  components = [],
  variables = [],
}: {
  textItems: TextItem[];
  components?: Component[];
  variables?: any[];
}) => {
  mockHttpClient.get.mockImplementation((url: string, config?: any) => {
    if (url.includes("/v2/textItems")) {
      return Promise.resolve({ data: textItems });
    }
    if (url.includes("/v2/variables")) {
      return Promise.resolve({ data: variables });
    }
    if (url.includes("/v2/components")) {
      return Promise.resolve({ data: components });
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

describe("pull command - end-to-end tests", () => {
  // Create a temporary directory for tests
  let testDir: string;
  let outputDir: string;

  // Reset appContext before each test
  beforeEach(() => {
    jest.clearAllMocks();

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

  describe("Filter Feature", () => {
    it("should filter projects when configured at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }, { id: "project-2" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter: '{"projects":[{"id":"project-1"},{"id":"project-2"}]}',
        },
      });
    });

    it("should filter variants at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        variants: [{ id: "variant-a" }, { id: "variant-b" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter:
            '{"projects":[{"id":"project-1"}],"variants":[{"id":"variant-a"},{"id":"variant-b"}]}',
        },
      });
    });

    it("should query components when source field is provided", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {},
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/components", {
        params: {
          filter: "{}",
        },
      });
    });

    it("should filter components by folder at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {
          folders: [{ id: "folder-1" }],
        },
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/components", {
        params: {
          filter: '{"folders":[{"id":"folder-1"}]}',
        },
      });
    });

    it("should filter components by folder and variants at base level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {
          folders: [{ id: "folder-1" }],
        },
        variants: [{ id: "variant-a" }, { id: "variant-b" }],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/components", {
        params: {
          filter:
            '{"folders":[{"id":"folder-1"}],"variants":[{"id":"variant-a"},{"id":"variant-b"}]}',
        },
      });
    });

    it("should filter components by folder at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {
          folders: [{ id: "folder-1" }],
        },
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            components: {
              folders: [{ id: "folder-3" }],
            },
          },
        ],
      });

      await pull({});

      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/components", {
        params: {
          filter: '{"folders":[{"id":"folder-3"}]}',
        },
      });
    });

    it("should filter components by folder and variants at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        components: {
          folders: [{ id: "folder-1" }],
        },
        outputs: [
          {
            format: "json",
            outDir: outputDir,
            components: {
              folders: [{ id: "folder-3" }],
            },
            variants: [{ id: "variant-a" }, { id: "variant-b" }],
          },
        ],
      });

      await pull({});

      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/components", {
        params: {
          filter:
            '{"folders":[{"id":"folder-3"}],"variants":[{"id":"variant-a"},{"id":"variant-b"}]}',
        },
      });
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

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter: '{"projects":[{"id":"project-1"}]}',
        },
      });
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

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter:
            '{"projects":[{"id":"project-1"}],"variants":[{"id":"variant-a"}]}',
        },
      });
    });

    it("supports the default filter behavior", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [],
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull({});

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter: '{"projects":[]}',
        },
      });
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/variables");

      // Components endpoint should not be called if not provided as source field
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("Output files - JSON", () => {
    it("should create output files for each project and variant returned from the API", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      appContext.setProjectConfig({
        projects: [],
        components: {},
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

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

      setupMocks({
        textItems: [
          ...baseTextItems,
          ...variantATextItems,
          ...variantBTextItems,
        ],
        components: [
          ...componentsBase,
          ...componentsVariantA,
          ...componentsVariantB,
        ],
      });

      await pull({});

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, [
        "project-1___base.json",
        "project-1___variant-a.json",
        "project-1___variant-b.json",
        "project-2___base.json",
        "project-2___variant-a.json",
        "components___base.json",
        "components___variant-a.json",
        "components___variant-b.json",
        "variables.json",
      ]);
    });
  });

  // Helper functions
  const setupIosStringsMocks = ({
    textItems = [],
    components = [],
    variables = [],
  }: {
    textItems: TextItem[];
    components?: Component[];
    variables?: any[];
  }) => {
    /*
    "this-is-a-ditto-text-item" = "No its not";

    "this-is-a-text-layer-on-figma" = "This is a Ditto text item (LinkedNode)";

    "update-preferences" = "Update preferences";
  */
    mockHttpClient.get.mockImplementation((url: string, config?: any) => {
      if (url.includes("/v2/textItems/export")) {
        return Promise.resolve({
          data: textItems
            .map((textItem) => `"${textItem.id}" = "${textItem.text}"`)
            .join("\n\n"),
        });
      }
      if (url.includes("/v2/variables")) {
        return Promise.resolve({ data: variables });
      }
      if (url.includes("/v2/components/export")) {
        return Promise.resolve({
          data: components
            .map((component) => `"${component.id}" = "${component.text}"`)
            .join("\n\n"),
        });
      }
      return Promise.resolve({ data: [] });
    });
  };

  describe("Output files - ios-strings", () => {
    it("should create output files for each project and variant returned from the API", async () => {
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

      setupIosStringsMocks({
        textItems: [
          ...baseTextItems,
          ...variantATextItems,
          ...variantBTextItems,
        ],
        components: [
          ...componentsBase,
          ...componentsVariantA,
          ...componentsVariantB,
        ],
      });

      await pull({});

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, [
        "project-1___base.strings",
        "project-1___variant-a.strings",
        "project-1___variant-b.strings",
        "project-2___base.strings",
        "project-2___variant-a.strings",
        "project-2___variant-b.strings", // BP: Should this not be here? Do we need to check output files to see if empty variant files for a project should be shown?
        "components___base.strings",
        "components___variant-a.strings",
        "components___variant-b.strings",
        "variables.json",
      ]);
    });
  });
});
