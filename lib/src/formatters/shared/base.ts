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

  /**
   * Generates the metadata filters that apply to every text item export.
   * These are the filters that are the same for every request/file.
   * Does not include variants, projects, or bases, which differ per request and are added separately.
   */
  protected generateTextItemPullFilter() {
    let filters: PullFilters = {
      statuses: this.projectConfig.statuses,
      integrated: this.projectConfig.integrated,
      tags: this.projectConfig.tags,
    };

    if (this.output.statuses) {
      filters.statuses = this.output.statuses;
    }

    if (this.output.integrated !== undefined) {
      filters.integrated = this.output.integrated;
    }

    if (this.output.tags) {
      filters.tags = this.output.tags;
    }

    return filters;
  }

  /**
   * Returns the filters that are the same for every component export request.
   * Does not include variants, which differ per request and are added separately.
   */
  protected generateComponentPullFilter() {
    let filters: PullFilters = {
      ...(this.projectConfig.components?.folders && {
        folders: this.projectConfig.components.folders,
      }),
      statuses: this.projectConfig.statuses,
      integrated: this.projectConfig.integrated,
      tags: this.projectConfig.tags,
    };

    if (this.output.components) {
      filters.folders = this.output.components?.folders;
    }

    if (this.output.statuses) {
      filters.statuses = this.output.statuses;
    }

    if (this.output.integrated !== undefined) {
      filters.integrated = this.output.integrated;
    }

    if (this.output.tags) {
      filters.tags = this.output.tags;
    }

    return filters;
  }

  /**
   * Returns the query params shared by every export request (/v2/textItems/export and
   * /v2/components/export): the stringified filter and richText. Per-request params
   * (variantId, format, format-specific flags) are added by BaseExportFormatter.
   */
  protected generateQueryParams(filters: PullFilters = {}): PullQueryParams {
    let params: PullQueryParams = {
      filter: JSON.stringify(filters),
    };

    // We must check against undefined here, as `richText: false` is a valid value that should be respected
    // A truthy check here would incorrectly ignore an explicit `false` value on an output-level setting.
    const richText =
      this.output.richText !== undefined
        ? this.output.richText
        : this.projectConfig.richText;

    // Now, we do a truthiness check - richText: false translates to no param on the request itself
    if (richText) {
      params.richText = richText;
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
    const files = this.transformAPIData(data);
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
