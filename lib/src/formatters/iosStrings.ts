import fetchText from "../http/textItems";
import { Component, ComponentsResponse, ExportTextItemsResponse, isTextItem, PullFilters, PullQueryParams, TextItem, TextItemsResponse } from "../http/types";
import fetchComponents from "../http/components";
import fetchVariables, { Variable } from "../http/variables";
import BaseFormatter from "./shared/base";
import OutputFile from "./shared/fileTypes/OutputFile";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";
import { applyMixins } from "./shared";
import { getFrameworkProcessor } from "./frameworks/json";
import fetchProjects from "../http/projects";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";

interface ProjectTextItemsMap {
  [projectId: string]: ExportTextItemsResponse
}

type IOSStringsAPIData = {
  projects: ProjectTextItemsMap;
  components: ComponentsResponse;
  variablesById: Record<string, Variable>;
};

type RequestType = "textItem" | "component";

export default class IOSStringsFormatter extends applyMixins(
  BaseFormatter<IOSStringsAPIData>) {

  protected async fetchAPIData() {
    const projects = await this.fetchProjectTextItemsMap();
    const components = await this.fetchComponents();
    const variables = await this.fetchVariables();

    const variablesById = variables.reduce((acc, variable) => {
      acc[variable.id] = variable;
      return acc;
    }, {} as Record<string, Variable>);

    return { projects, variablesById, components };
  }

  protected async transformAPIData(data: IOSStringsAPIData) {
    console.log("DATA: ", data.projects)
    Object.keys(data.projects).map((projectId: string) => {
    const fileName = `${projectId}___${variantId || "base"}`;
      this.outputFiles[fileName] ??= new IOSStringsOutputFile({
        filename: fileName,
        path: this.outDir,
        metadata: { variantId: textEntity.variantId || "base" },
      });
    })

    this.outputFiles[fileName] ??= new IOSStringsOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: textEntity.variantId || "base" },
    });
    let results: OutputFile[] = [
      ...Object.values(this.outputFiles),
      this.variablesOutputFile,
    ]

    if (this.output.framework) {
      // process framework
      results.push(...getFrameworkProcessor(this.output).process(this.outputFiles));
    }
  }

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
      ...(this.projectConfig.components?.folders && { folders: this.projectConfig.components.folders }),
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
  private generateQueryParams(requestType: RequestType, additionalFilterParams = {}): PullQueryParams {
    const filter = requestType === "textItem" ? this.generateTextItemPullFilter() : this.generateComponentPullFilter();

    let params: PullQueryParams = {
      filter: JSON.stringify({ ...filter, ...additionalFilterParams }),
    };

    if (this.projectConfig.richText) {
      params.richText = this.projectConfig.richText;
    }

    if (this.output.richText) {
      params.richText = this.output.richText;
    }


    return { ...params, format: 'ios-strings' };
  }

  /**
   * Fetches text item data via API.
   * Skips the fetch request if projects field is not specified in config.
   * 
   * @returns text items data
   */
  private async fetchProjectTextItemsMap(): Promise<ProjectTextItemsMap> {
    if (!this.projectConfig.projects && !this.output.projects) return {};
    let projects: { id: string }[] = this.output.projects ?? this.projectConfig.projects ?? [];
    const result: ProjectTextItemsMap = {};

    if (projects.length === 0) {
      projects = await fetchProjects(this.meta);
    }

    for (const project of projects) {
      const projectIosStringsFile = await fetchText<ExportTextItemsResponse>(this.generateQueryParams("textItem", { projects: [{ id: project.id }] }), this.meta);
      result[project.id] = projectIosStringsFile;
    }
    
    return result;
  }

  /**
   * Fetches component data via API.
   * Skips the fetch request if components field is not specified in config.
   * 
   * @returns components data
   */
  private async fetchComponents() {
    if (!this.projectConfig.components && !this.output.components) return [];

    return await fetchComponents(this.generateQueryParams("component"), this.meta);
  }

  private async fetchVariables() {
    return await fetchVariables(this.meta);
  }
}
