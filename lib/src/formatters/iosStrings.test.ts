import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";
import IOSStringsFormatter from "./iosStrings";

jest.mock("../utils/appContext", () => ({
  __esModule: true,
  default: {
    outDir: "/mock/app/context/outDir",
  },
}));

// @ts-ignore
class TestIOSStringsFormatter extends IOSStringsFormatter {
  public createOutputFilePublic(
    fileName: string,
    variantId: string,
    content: string
  ) {
    // @ts-ignore
    return super.createOutputFile(fileName, variantId, content);
  }

  public getExportFormat() {
    // @ts-ignore
    return this.exportFormat;
  }

  public getOutputFiles() {
    // @ts-ignore
    return this.outputFiles;
  }

  public getLocalesPath(variantId: string) {
    // @ts-ignore
    return super.getLocalesPath(variantId);
  }
}

describe("IOSStringsFormatter", () => {
  // @ts-ignore
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "ios-strings",
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
      } as any,
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  it("has export format of ios-strings", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestIOSStringsFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    expect(formatter.getExportFormat()).toBe("ios-strings");
  });

  it("creates IOSStringsOutputFile with correct metadata and content", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestIOSStringsFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const fileName = "cli-testing-project___spanish";
    const variantId = "spanish";
    const content = "file-content";

    formatter.createOutputFilePublic(fileName, variantId, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as IOSStringsOutputFile<{
      variantId: string;
    }>;

    expect(file).toBeInstanceOf(IOSStringsOutputFile);
    expect(file.fullPath).toBe(
      "/test/output/cli-testing-project___spanish.strings"
    );
    expect(file.metadata).toEqual({ variantId: "spanish" });
    expect(file.content).toBe("file-content");
  });

  it("defaults variantId metadata to 'base' when variantId is falsy", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestIOSStringsFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const fileName = "cli-testing-project___base";
    const content = "base-content";

    formatter.createOutputFilePublic(fileName, "" as any, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as IOSStringsOutputFile<{
      variantId: string;
    }>;

    expect(file.metadata).toEqual({ variantId: "base" });
    expect(file.content).toBe("base-content");
  });

  describe("getLocalesPath", () => {
    it("should return output outDir when iosLocales is not configured", () => {
      const projectConfig = createMockProjectConfig({
        iosLocales: undefined,
      });
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestIOSStringsFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = formatter.getLocalesPath("base");

      expect(result).toBe("/test/output");
    });

    it("should return output outDir when iosLocales is empty array", () => {
      const projectConfig = createMockProjectConfig({
        iosLocales: undefined,
      });
      const output = createMockOutput({ outDir: "/test/output" });
      // @ts-ignore
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
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
      const formatter = new TestIOSStringsFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const result = formatter.getLocalesPath("base");

      expect(result).toBe("/mock/app/context/outDir/en.lproj");
    });
  });
});
