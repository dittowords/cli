import ARBFormatter from "./arb";
import ARBOutputFile from "./shared/fileTypes/ARBOutputFile";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";

// @ts-ignore
class TestARBFormatter extends ARBFormatter {
  public createOutputFilePublic(
    filePrefix: string,
    fileName: string,
    variantId: string,
    content: Record<string, unknown>
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

describe("ARBFormatter", () => {
  // @ts-ignore
  const createMockOutput = (overrides: Partial<Output> = {}): Output => ({
    format: "json",
    framework: "arb",
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
        framework: "arb",
      } as any,
    ],
    ...overrides,
  });

  const createMockMeta = (): CommandMetaFlags => ({});

  it("has export format of arb", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestARBFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    expect(formatter.getExportFormat()).toBe("arb");
  });

  it("creates ARBOutputFile with correct metadata and content", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestARBFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const filePrefix = "cli-testing-project";
    const fileName = `${filePrefix}___spanish`;
    const variantId = "spanish";
    const content = { greeting: "Hola" };

    formatter.createOutputFilePublic(filePrefix, fileName, variantId, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as ARBOutputFile<{ variantId: string }>;

    expect(file).toBeInstanceOf(ARBOutputFile);
    expect(file.fullPath).toBe("/test/output/cli-testing-project___spanish.arb");
    expect(file.metadata).toEqual({ variantId: "spanish" });
    expect(file.content).toEqual(content);
  });

  it("defaults variantId metadata to 'base' when variantId is falsy", () => {
    const output = createMockOutput({ outDir: "/test/output" });
    const projectConfig = createMockProjectConfig();
    const formatter = new TestARBFormatter(
      output,
      projectConfig,
      createMockMeta()
    );

    const filePrefix = "cli-testing-project";
    const fileName = `${filePrefix}___base`;
    const content = { greeting: "Hello" };

    formatter.createOutputFilePublic(filePrefix, fileName, "" as any, content);

    const files = formatter.getOutputFiles();
    const file = files[fileName] as ARBOutputFile<{ variantId: string }>;

    expect(file.metadata).toEqual({ variantId: "base" });
    expect(file.content).toEqual(content);
  });
});
