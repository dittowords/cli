import AndroidOutputFile from "./shared/fileTypes/AndroidOutputFile";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";
import AndroidXMLFormatter from "./android";

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
});
