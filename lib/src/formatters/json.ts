import fetchText, { PullFilters, TextItemsResponse } from "../http/textItems";
import fetchVariables, { Variable, VariablesResponse } from "../http/variables";
import BaseFormatter from "./shared/base";
import OutputFile from "./shared/fileTypes/OutputFile";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";
import appContext from "../utils/appContext";
import { applyMixins } from "./shared";
import { getFrameworkProcessor } from "./frameworks/json";

type JSONAPIData = {
  textItems: TextItemsResponse;
  variablesById: Record<string, Variable>;
};

export default class JSONFormatter extends applyMixins(
  BaseFormatter<JSONAPIData>) {

  protected async fetchAPIData() {
    const filters = this.generatePullFilter();
    const textItems = await fetchText(filters);
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
      const richTextConfigured = this.output.richText === "html" || this.projectConfig.richText === "html" && this.output.richText !== "false"
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

    if (this.projectConfig.richText === "html" || this.output.richText === "html") {
      filters.richText = "html";
    }

    return filters;
  }
}
