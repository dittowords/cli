import IOSStringsDictFormatter from "./iosStringsDict";
import IOSStringsDictOutputFile from "./shared/fileTypes/IOSStringsDictOutputFile";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";

// @ts-ignore
class TestIOSStringsDictFormatter extends IOSStringsDictFormatter {
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
}

describe("IOSStringsDictFormatter", () => {
  // @ts-ignore
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "ios-stringsdict",
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
        // Minimal valid output config for this formatter
        format: "ios-stringsdict",
      } as any,
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  it("has export format of ios-stringsdict", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestIOSStringsDictFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    expect(formatter.getExportFormat()).toBe("ios-stringsdict");
  });

  it("creates IOSStringsDictOutputFile with correct metadata and content", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestIOSStringsDictFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const fileName = "cli-testing-project___spanish";
    const variantId = "spanish";
    const content = "file-content";

    formatter.createOutputFilePublic(fileName, variantId, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as IOSStringsDictOutputFile<{
      variantId: string;
    }>;

    expect(file).toBeInstanceOf(IOSStringsDictOutputFile);
    expect(file.fullPath).toBe(
      "/test/output/cli-testing-project___spanish.stringsdict"
    );
    expect(file.metadata).toEqual({ variantId: "spanish" });
    expect(file.content).toBe("file-content");
  });

  it("defaults variantId metadata to 'base' when variantId is falsy", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestIOSStringsDictFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const fileName = "cli-testing-project___base";
    const content = "base-content";

    formatter.createOutputFilePublic(fileName, "" as any, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as IOSStringsDictOutputFile<{
      variantId: string;
    }>;

    expect(file.metadata).toEqual({ variantId: "base" });
    expect(file.content).toBe("base-content");
  });
});
