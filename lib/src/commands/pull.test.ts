import { pull } from "./pull";
import httpClient from "../http/client";
import { TextItem } from "../http/textItems";
import appContext from "../utils/appContext";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

jest.mock("../http/client");

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

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
const setupMocks = (textItems: TextItem[] = [], variables: any[] = []) => {
  mockHttpClient.get.mockImplementation((url: string) => {
    if (url.includes("/v2/textItems")) {
      return Promise.resolve({ data: textItems });
    }
    if (url.includes("/v2/variables")) {
      return Promise.resolve({ data: variables });
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
  textId: string,
  expectedText: string
) => {
  const content = parseJsonFile(filepath);
  expect(content[textId]).toBe(expectedText);
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
      setupMocks([mockTextItem], []);

      // Set up appContext - this is what actually drives the test
      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        richText: "html",
        outputs: [{ format: "json", outDir: outputDir }],
      });

      await pull();

      // Verify rich text content was written
      assertFileContainsText(
        path.join(outputDir, "project-1___base.json"),
        "text-1",
        "<p>Rich <strong>HTML</strong> content</p>"
      );
    });

    it("should use plain text when richText is disabled at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      const mockTextItem = createMockTextItem();
      setupMocks([mockTextItem], []);

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        richText: "html",
        outputs: [{ format: "json", outDir: outputDir, richText: false }],
      });

      await pull();

      // Verify plain text content was written despite base config
      assertFileContainsText(
        path.join(outputDir, "project-1___base.json"),
        "text-1",
        "Plain text content"
      );
    });

    it("should use rich text when enabled only at output level", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

      const mockTextItem = createMockTextItem();
      setupMocks([mockTextItem], []);

      appContext.setProjectConfig({
        projects: [{ id: "project-1" }],
        outputs: [{ format: "json", outDir: outputDir, richText: "html" }],
      });

      await pull();

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

      await pull();

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

      await pull();

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter:
            '{"projects":[{"id":"project-1"}],"variants":[{"id":"variant-a"},{"id":"variant-b"}]}',
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

      await pull();

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

      await pull();

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
        outputs: [
          {
            format: "json",
            outDir: outputDir,
          },
        ],
      });

      await pull();

      // Verify correct API call with filtered params
      expect(mockHttpClient.get).toHaveBeenCalledWith("/v2/textItems", {
        params: {
          filter: "{}",
        },
      });
    });
  });

  describe("Output files", () => {
    it("should create output files for each project and variant returned from the API", async () => {
      fs.mkdirSync(outputDir, { recursive: true });

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

      setupMocks(
        [...baseTextItems, ...variantATextItems, ...variantBTextItems],
        []
      );

      await pull();

      // Verify a file was created for each project and variant present in the (mocked) API response
      assertFilesCreated(outputDir, [
        "project-1___base.json",
        "project-1___variant-a.json",
        "project-1___variant-b.json",
        "project-2___base.json",
        "project-2___variant-a.json",
        "variables.json",
      ]);
    });
  });
});
