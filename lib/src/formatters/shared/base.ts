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

  protected generateTextItemPullFilter() {
    let filters: PullFilters = {
      projects: this.projectConfig.projects,
      variants: this.projectConfig.variants,
      statuses: this.projectConfig.statuses,
    };

    if (this.output.projects) {
      filters.projects = this.output.projects;
    }

    if (this.output.variants) {
      filters.variants = this.output.variants;
    }

    if (this.output.statuses) {
      filters.statuses = this.output.statuses;
    }

    return filters;
  }

  protected generateComponentPullFilter() {
    let filters: PullFilters = {
      ...(this.projectConfig.components?.folders && {
        folders: this.projectConfig.components.folders,
      }),
      variants: this.projectConfig.variants,
      statuses: this.projectConfig.statuses,
    };

    if (this.output.components) {
      filters.folders = this.output.components?.folders;
    }

    if (this.output.variants) {
      filters.variants = this.output.variants;
    }

    if (this.output.statuses) {
      filters.statuses = this.output.statuses;
    }

    return filters;
  }

  /**
   * Returns the query parameters for the fetchText API request
   */
  protected generateQueryParams(filters: PullFilters = {}): PullQueryParams {
    let params: PullQueryParams = {
      filter: JSON.stringify(filters),
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

  public async format(): Promise<void> {
    const data = await this.fetchAPIData();
    const files = await this.transformAPIData(data);
    await this.writeFiles(files);
  }

  protected async writeFiles(files: OutputFile[]): Promise<void> {
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
