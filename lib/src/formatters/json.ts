import fetchText, { PullFilters, TextItemsResponse } from "../http/textItems";
import fetchVariables, { VariablesResponse } from "../http/variables";
import BaseFormatter from "./shared/base";
import OutputFile from "./shared/fileTypes/OutputFile";
import JSONOutputFile from "./shared/fileTypes/JSONOutputFile";
import appContext from "../utils/appContext";
import { applyMixins } from "./shared";
import javascriptCodegenMixin from "./mixins/javascriptCodegenMixin";
import { getFrameworkProcessor } from "./frameworks";

type JSONAPIData = {
  textItems: TextItemsResponse;
  variablesById: Record<string, VariablesResponse[number]>;
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
    }, {} as Record<string, VariablesResponse[number]>);

    return { textItems, variablesById};
  }

  protected async transformAPIData(data: JSONAPIData) {
    const outputDir = appContext.projectConfigDir;

    let outputJsonFiles: Record<
      string,
      JSONOutputFile<{ variantId: string }>
    > = {};

    const variablesOutputFile = new JSONOutputFile(
      "variables",
      appContext.projectConfigDir
    );

    for (let i = 0; i < data.textItems.length; i++) {
      const textItem = data.textItems[i];

      outputJsonFiles[textItem.projectId] ??= new JSONOutputFile(
        `${textItem.projectId}___${textItem.variantId || "base"}`,
        outputDir,
        {},
        { variantId: textItem.variantId ||"base" }
      );

      outputJsonFiles[textItem.projectId].content[textItem.id] = textItem.text;
      for (const variableId of textItem.variableIds) {
        const variableData = data.variablesById[variableId];
        variablesOutputFile.content[variableId] = variableData.data;
      }
    }

    let results: OutputFile[] = [
      ...Object.values(outputJsonFiles),
      variablesOutputFile,
    ]

    if (this.output.framework) {
      // process framework
      results.push(...getFrameworkProcessor(this.output.framework).process(outputJsonFiles));
    }

    return results;
  }

  private generatePullFilter() {
    let filters: PullFilters = {};

    if (this.projectConfig.projects && this.projectConfig.projects.length > 0) {
      filters.projects = this.projectConfig.projects.map((project) => ({
        id: project,
      }));
    }

    if (this.projectConfig.variants && this.projectConfig.variants.length > 0) {
      filters.variants = this.projectConfig.variants.map((variant) => ({
        id: variant,
      }));
    }

    return filters;
  }
}
