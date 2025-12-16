import fetchText from "../http/textItems";
import { Component, ComponentsResponse, isTextItem, PullFilters, PullQueryParams, TextItem, TextItemsResponse } from "../http/types";
import fetchComponents from "../http/components";
import fetchVariables, { Variable } from "../http/variables";
import BaseFormatter from "./shared/base";
import OutputFile from "./shared/fileTypes/OutputFile";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";
import { applyMixins } from "./shared";
import { getFrameworkProcessor } from "./frameworks/json";

type JSONAPIData = {
  textItems: TextItemsResponse;
  components: ComponentsResponse;
  variablesById: Record<string, Variable>;
};

type RequestType = "textItem" | "component";

export default class JSONFormatter extends applyMixins(
  BaseFormatter<JSONAPIData>) {

  protected async fetchAPIData() {
    const textItems = await this.fetchTextItems();
    const components = await this.fetchComponents();
    const variables = await this.fetchVariables();

    const variablesById = variables.reduce((acc, variable) => {
      acc[variable.id] = variable;
      return acc;
    }, {} as Record<string, Variable>);

    return { textItems, variablesById, components };
  }

  protected async transformAPIData(data: JSONAPIData) {
    for (let i = 0; i < data.textItems.length; i++) {
      const textItem = data.textItems[i];
      this.transformAPITextEntity(textItem, data.variablesById);
    }

    for (let i = 0; i < data.components.length; i++) {
      const component = data.components[i];
      this.transformAPITextEntity(component, data.variablesById);
    }

    let results: OutputFile[] = [
      ...Object.values(this.outputJsonFiles),
      this.variablesOutputFile,
    ]

    if (this.output.framework) {
      // process framework
      results.push(...getFrameworkProcessor(this.output).process(this.outputJsonFiles));
    }

    return results;
  }

  /**
   * Transforms text entity returned from API response into JSON and inserts into corresponding output file.
   * @param textEntity The text entity returned from API response.
   * @param variablesById Mapping of devID <> variable data returned from API response.
   */
  private transformAPITextEntity(textEntity: TextItem | Component, variablesById: Record<string, Variable>) {
    const fileName = isTextItem(textEntity) ? `${textEntity.projectId}___${textEntity.variantId || "base"}` : `components___${textEntity.variantId || "base"}`;

    this.outputJsonFiles[fileName] ??= new JSONOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: textEntity.variantId || "base" },
    });
    
    // Use richText if available and configured, otherwise use text
    const outputRichTextEnabled = this.output.richText === "html"
    const baseRichTextEnabledAndNotOveridden = this.projectConfig.richText === "html" && this.output.richText !== false
    const richTextConfigured = outputRichTextEnabled || baseRichTextEnabledAndNotOveridden 
    const textValue = richTextConfigured && textEntity.richText
      ? textEntity.richText 
      : textEntity.text;

    this.outputJsonFiles[fileName].content[textEntity.id] = textValue;
    for (const variableId of textEntity.variableIds) {
      const variable = variablesById[variableId];
      this.variablesOutputFile.content[variableId] = variable.data;
    }
  }

  private generateTextItemPullFilter() {
    let filters: PullFilters = {
      projects: this.projectConfig.projects,
      variants: this.projectConfig.variants,
      statuses: this.projectConfig.statuses
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

  private generateComponentPullFilter() {
    let filters: PullFilters = {
      ...(this.projectConfig.components?.folders && { folders: this.projectConfig.components.folders }),
      variants: this.projectConfig.variants,
      statuses: this.projectConfig.statuses
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
  private generateQueryParams(requestType: RequestType) {
    const filter = requestType === "textItem" ? this.generateTextItemPullFilter() : this.generateComponentPullFilter();

    let params: PullQueryParams = {
      filter: JSON.stringify(filter),
    };

    if (this.projectConfig.richText) {
      params.richText = this.projectConfig.richText;
    }

    if (this.output.richText) {
      params.richText = this.output.richText;
    }


    return params;
  }

  /**
   * Fetches text item data via API.
   * Skips the fetch request if projects field is not specified in config.
   * 
   * @returns text items data
   */
  private async fetchTextItems() {
    if (!this.projectConfig.projects && !this.output.projects) return [];

    return await fetchText(this.generateQueryParams("textItem"), this.meta);
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
