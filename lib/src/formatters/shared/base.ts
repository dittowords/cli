import { Output } from "../../outputs";
import { writeFile } from "../../utils/fileSystem";
import logger from "../../utils/logger";
import { ProjectConfigYAML } from "../../services/projectConfig";
import OutputFile from "./fileTypes/OutputFile";
import appContext from "../../utils/appContext";
import JSONOutputFile from "./fileTypes/JSONOutputFile";
import {
  CommandMetaFlags,
  PullFilters,
  PullQueryParams,
} from "../../http/types";

type RequestType = "textItem" | "component";
export default class BaseFormatter<OutputFileType, APIDataType = unknown> {
  protected output: Output;
  protected projectConfig: ProjectConfigYAML;
  protected outDir: string;
  protected outputFiles: Record<string, OutputFileType>;
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

  // BP: this might not be supported for export, might need to keep old implementation
  //.    at the json level, then use this for all the export ones
  private generateTextItemPullFilter() {
    let filters: PullFilters = {
      projects: this.projectConfig.projects,
      variants: this.projectConfig.variants,
    };

    if (this.output.projects) {
      filters.projects = this.output.projects;
    }

    if (this.output.variants) {
      filters.variants = this.output.variants;
    }

    return filters;
  }

  private generateComponentPullFilter() {
    let filters: PullFilters = {
      ...(this.projectConfig.components?.folders && {
        folders: this.projectConfig.components.folders,
      }),
      variants: this.projectConfig.variants,
    };

    if (this.output.components) {
      filters.folders = this.output.components?.folders;
    }

    if (this.output.variants) {
      filters.variants = this.output.variants;
    }

    return filters;
  }

  /**
   * Returns the query parameters for the fetchText API request
   */
  protected generateQueryParams(
    requestType: RequestType,
    filter: PullFilters = {}
  ): PullQueryParams {
    const baseFilter =
      requestType === "textItem"
        ? this.generateTextItemPullFilter()
        : this.generateComponentPullFilter();

    let params: PullQueryParams = {
      filter: JSON.stringify({ ...baseFilter, ...filter }),
    };

    if (this.projectConfig.richText) {
      params.richText = this.projectConfig.richText;
    }

    if (this.output.richText) {
      params.richText = this.output.richText;
    }

    return params;
  }

  protected async fetchAPIData(): Promise<APIDataType> {
    return {} as APIDataType;
  }

  protected transformAPIData(data: APIDataType): OutputFile[] {
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
