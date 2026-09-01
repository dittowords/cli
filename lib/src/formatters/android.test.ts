import AndroidOutputFile from "./shared/fileTypes/AndroidOutputFile";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";
import AndroidXMLFormatter from "./android";

jest.mock("../utils/appContext", () => ({
  __esModule: true,
  default: {
    outDir: "/mock/app/context/outDir",
  },
}));

// @ts-ignore
class TestAndroidXMLFormatter extends AndroidXMLFormatter {
  public createOutputFilePublic(
    filePrefix: string,
    fileName: string,
    variantId: string,
    content: string
  ) {
    // @ts-ignore
    return super.createOutputFile(filePrefix, fileName, variantId, content);
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

  public getVariantLocale(variantId: string) {
    // @ts-ignore
    return super.getVariantLocale(variantId);
  }

  public isLocaleStructured(variantId: string) {
    // @ts-ignore
    return super.isLocaleStructured(variantId);
  }

  public toAndroidLocaleQualifier(locale: string) {
    // @ts-ignore
    return super.toAndroidLocaleQualifier(locale);
  }
}

describe("AndroidXMLFormatter", () => {
  // @ts-ignore
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "android",
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
        format: "android",
      } as any,
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  it("has export format of android", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestAndroidXMLFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    expect(formatter.getExportFormat()).toBe("android");
  });

  it("creates AndroidOutputFile with correct metadata and content", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestAndroidXMLFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const projectId = "cli-testing-project";
    const fileName = `${projectId}___spanish`;
    const variantId = "spanish";
    const content = "file-content";

    formatter.createOutputFilePublic(projectId, fileName, variantId, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as AndroidOutputFile<{
      variantId: string;
    }>;

    expect(file).toBeInstanceOf(AndroidOutputFile);
    expect(file.fullPath).toBe(
      "/test/output/cli-testing-project___spanish.xml"
    );
    expect(file.metadata).toEqual({ variantId: "spanish" });
    expect(file.content).toBe("file-content");
  });

  it("defaults variantId metadata to 'base' when variantId is falsy", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestAndroidXMLFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const filePrefix = "cli-testing-project";
    const fileName = `${filePrefix}___base`;
    const content = "base-content";

    formatter.createOutputFilePublic(filePrefix, fileName, "" as any, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as AndroidOutputFile<{
      variantId: string;
    }>;

    expect(file.metadata).toEqual({ variantId: "base" });
    expect(file.content).toBe("base-content");
  });

  describe("getVariantLocale", () => {
    it("should return undefined when androidLocales is not configured", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: undefined,
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getVariantLocale("spanish")).toBe(undefined);
    });

    it("should return undefined when androidLocales is configured but variant doesn't have a match", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getVariantLocale("japanese")).toBe(undefined);
    });

    it("should return matching locale when androidLocales is configured and variant has a match", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getVariantLocale("spanish")).toEqual({ spanish: "es" });
    });
  });

  describe("isLocaleStructured", () => {
    it("returns false when androidLocales is not configured, even for the base variant", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: undefined,
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.isLocaleStructured("base")).toBe(false);
      expect(formatter.isLocaleStructured("")).toBe(false);
    });

    it("returns true for the base variant when androidLocales is configured, without needing an explicit base entry", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.isLocaleStructured("base")).toBe(true);
      expect(formatter.isLocaleStructured("")).toBe(true);
    });

    it("returns false for a non-base variant that isn't mapped in androidLocales", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.isLocaleStructured("japanese")).toBe(false);
    });
  });

  describe("toAndroidLocaleQualifier", () => {
    it("passes through a language-only locale unchanged", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.toAndroidLocaleQualifier("es")).toBe("es");
    });

    it("prefixes a hyphenated region subtag with a lowercase r", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.toAndroidLocaleQualifier("es-MX")).toBe("es-rMX");
    });

    it("prefixes an underscore-separated region subtag with a lowercase r", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.toAndroidLocaleQualifier("es_MX")).toBe("es-rMX");
    });

    it("normalizes the region subtag's casing regardless of input casing", () => {
      const projectConfig = createMockProjectConfig();
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.toAndroidLocaleQualifier("es-mx")).toBe("es-rMX");
    });
  });

  describe("getLocalesPath", () => {
    it("returns the output outDir when androidLocales is not configured", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: undefined,
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getLocalesPath("base")).toBe("/test/output");
    });

    it("maps the base variant to the default values directory when androidLocales is configured", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getLocalesPath("base")).toBe(
        "/mock/app/context/outDir/values"
      );
      expect(formatter.getLocalesPath("")).toBe(
        "/mock/app/context/outDir/values"
      );
    });

    it("maps a mapped non-base variant to its values-<locale> directory", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getLocalesPath("spanish")).toBe(
        "/mock/app/context/outDir/values-es"
      );
    });

    it("falls back to the output outDir for a non-base variant not mapped in androidLocales", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getLocalesPath("japanese")).toBe("/test/output");
    });

    it("maps a mapped variant with a region-qualified locale to its values-<lang>-r<REGION> directory", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ mexicanSpanish: "es-MX" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getLocalesPath("mexicanSpanish")).toBe(
        "/mock/app/context/outDir/values-es-rMX"
      );
    });

    it("uses androidLocalesOutDir instead of appContext.outDir when configured", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
        androidLocalesOutDir: "android/app/src/main/res",
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      expect(formatter.getLocalesPath("base")).toBe(
        "android/app/src/main/res/values"
      );
      expect(formatter.getLocalesPath("spanish")).toBe(
        "android/app/src/main/res/values-es"
      );
    });
  });

  describe("createOutputFile with androidLocales configured", () => {
    it("drops the variantId suffix and writes into values/ for the base variant", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filePrefix = "cli-testing-project";
      const fileName = `${filePrefix}___base`;
      formatter.createOutputFilePublic(filePrefix, fileName, "", "content");

      const file = formatter.getOutputFiles()[fileName] as AndroidOutputFile<{
        variantId: string;
      }>;

      expect(file.fullPath).toBe(
        "/mock/app/context/outDir/values/cli-testing-project.xml"
      );
    });

    it("drops the variantId suffix and writes into values-<locale>/ for a mapped variant", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filePrefix = "cli-testing-project";
      const fileName = `${filePrefix}___spanish`;
      formatter.createOutputFilePublic(
        filePrefix,
        fileName,
        "spanish",
        "content"
      );

      const file = formatter.getOutputFiles()[fileName] as AndroidOutputFile<{
        variantId: string;
      }>;

      expect(file.fullPath).toBe(
        "/mock/app/context/outDir/values-es/cli-testing-project.xml"
      );
    });

    it("keeps the variantId suffix and writes into the output outDir for an unmapped variant", () => {
      const projectConfig = createMockProjectConfig({
        androidLocales: [{ spanish: "es" }],
      });
      const output = createMockOutput({ outDir: "/test/output" });
      const formatter = new TestAndroidXMLFormatter(
        output,
        projectConfig,
        createMockMeta()
      );

      const filePrefix = "cli-testing-project";
      const fileName = `${filePrefix}___japanese`;
      formatter.createOutputFilePublic(
        filePrefix,
        fileName,
        "japanese",
        "content"
      );

      const file = formatter.getOutputFiles()[fileName] as AndroidOutputFile<{
        variantId: string;
      }>;

      expect(file.fullPath).toBe(
        "/test/output/cli-testing-project___japanese.xml"
      );
    });
  });
});
