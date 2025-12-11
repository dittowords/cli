import { Output } from "../../outputs";
import { writeFile } from "../../utils/fileSystem";
import logger from "../../utils/logger";
import { ProjectConfigYAML } from "../../services/projectConfig";
import OutputFile from "./fileTypes/OutputFile";
import appContext from "../../utils/appContext";
import JSONOutputFile from "./fileTypes/JSONOutputFile";
import { CommandMetaFlags } from "../../http/types";

export default class BaseFormatter<APIDataType = unknown> {
  protected output: Output;
  protected projectConfig: ProjectConfigYAML;
  protected outDir: string;
  protected outputFiles: Record<string, JSONOutputFile<{ variantId: string }>>;
  protected variablesOutputFile: JSONOutputFile<unknown>;
  protected meta: CommandMetaFlags;

  constructor(
    output: Output,
    projectConfig: ProjectConfigYAML,
    meta: CommandMetaFlags
  ) {
    this.output = output;
    this.projectConfig = projectConfig;
    this.outDir = output.outDir ?? appContext.outDir;
    this.outputFiles = {};
    this.variablesOutputFile = new JSONOutputFile({
      filename: "variables",
      path: this.outDir,
    });
    this.meta = meta;
  }

  protected async fetchAPIData(): Promise<APIDataType> {
    return {} as APIDataType;
  }

  protected async transformAPIData(data: APIDataType): Promise<OutputFile[]> {
    return [];
  }

  async format(): Promise<void> {
    const data = await this.fetchAPIData();
    const files = await this.transformAPIData(data);
    await this.writeFiles(files);
  }

  private async writeFiles(files: OutputFile[]): Promise<void> {
    await Promise.all(
      files.map((file) =>
        writeFile(file.fullPath, file.formattedContent).then(() => {
          logger.writeLine(
            `Successfully saved to ${logger.info(file.fullPath)}`
          );
        })
      )
    );
  }
}
