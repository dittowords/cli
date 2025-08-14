import fetchText, { TextItemsResponse, PullFilters, PullQueryParams } from "../http/textItems";
import fetchVariables, { Variable } from "../http/variables";
import BaseFormatter from "./shared/base";
import OutputFile from "./shared/fileTypes/OutputFile";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";
import { applyMixins } from "./shared";
import { getFrameworkProcessor } from "./frameworks/json";

type JSONAPIData = {
  textItems: TextItemsResponse;
  variablesById: Record<string, Variable>;
};

export default class JSONFormatter extends applyMixins(
  BaseFormatter<JSONAPIData>) {

  protected async fetchAPIData() {
    const queryParams = this.generateQueryParams();
    const textItems = await fetchText(queryParams);
    const variables = await fetchVariables();

    const variablesById = variables.reduce((acc, variable) => {
      acc[variable.id] = variable;
      return acc;
    }, {} as Record<string, Variable>);

    return { textItems, variablesById };
  }

  protected async transformAPIData(data: JSONAPIData) {

    let outputJsonFiles: Record<
      string,
      JSONOutputFile<{ variantId: string }>
    > = {};

    const variablesOutputFile = new JSONOutputFile({
      filename: "variables",
      path: this.outDir,
    });

    for (let i = 0; i < data.textItems.length; i++) {
      const textItem = data.textItems[i];
    
      const fileName = `${textItem.projectId}___${textItem.variantId || "base"}`;

      outputJsonFiles[fileName] ??= new JSONOutputFile({
        filename: fileName,
        path: this.outDir,
        metadata: { variantId: textItem.variantId || "base" },
      });
      
      // Use richText if available and configured, otherwise use text
      const outputRichTextEnabled = this.output.richText === "html"
      const baseRichTextEnabledAndNotOveridden = this.projectConfig.richText === "html" && this.output.richText !== false
      const richTextConfigured = outputRichTextEnabled || baseRichTextEnabledAndNotOveridden 
      const textValue = richTextConfigured && textItem.richText
        ? textItem.richText 
        : textItem.text;

      outputJsonFiles[fileName].content[textItem.id] = textValue;
      for (const variableId of textItem.variableIds) {
        const variable = data.variablesById[variableId];
        variablesOutputFile.content[variableId] = variable.data;
      }
    }

    let results: OutputFile[] = [
      ...Object.values(outputJsonFiles),
      variablesOutputFile,
    ]

    if (this.output.framework) {
      // process framework
      results.push(...getFrameworkProcessor(this.output).process(outputJsonFiles));
    }

    return results;
  }

  private generatePullFilter() {
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

  /**
   * Returns the query parameters for the fetchText API request
   */
  private generateQueryParams() {
    const filter = this.generatePullFilter();
    
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
}
