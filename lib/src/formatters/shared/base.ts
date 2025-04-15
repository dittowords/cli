import { Output } from "../../outputs";
import { writeFile } from "../../utils/fileSystem";
import logger from "../../utils/logger";
import { ProjectConfigYAML } from "../../services/projectConfig";
import OutputFile from "./fileTypes/OutputFile";
import appContext from "../../utils/appContext";

export default class BaseFormatter<APIDataType = unknown> {
  protected output: Output;
  protected projectConfig: ProjectConfigYAML;
  protected outputDir: string;

  constructor(output: Output, projectConfig: ProjectConfigYAML) {
    this.output = output;
    this.projectConfig = projectConfig;
    this.outputDir = output.outDir ?? appContext.projectConfigDir;
  }

  protected async fetchAPIData(): Promise<APIDataType> {
    return {} as APIDataType;
  }

  protected async transformAPIData(data: APIDataType): Promise<OutputFile[]> {
    return [];
  }

  async format(
    output: Output,
    projectConfig: ProjectConfigYAML
  ): Promise<void> {
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
