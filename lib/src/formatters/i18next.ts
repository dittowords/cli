import fetchText, { PullFilters, TextItemsResponse } from "../http/textItems";
import fetchVariables, { VariablesResponse } from "../http/variables";
import BaseFormatter from "./sharedFormatters/BaseFormatter";
import OutputFile from "./fileTypes/OutputFile";
import JSONOutputFile from "./fileTypes/JSONOutputFile";
import appContext from "../utils/appContext";
import JavascriptOutputFile from "./fileTypes/JavascriptOutputFile";
import { applyMixins } from "./sharedFormatters";
import javascriptCodegenMixin from "./sharedFormatters/javascriptCodegenMixin";

type I18NextAPIData = {
  textItems: TextItemsResponse;
  variablesById: Record<string, VariablesResponse[number]>;
};

export default class I18NextFormatter extends applyMixins(
  BaseFormatter<I18NextAPIData>,
  javascriptCodegenMixin
) {
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

  protected async transformAPIData(data: I18NextAPIData) {
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

    return [
      ...Object.values(outputJsonFiles),
      variablesOutputFile,
      this.generateDriverFile(outputJsonFiles),
    ];
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

  private generateDriverFile(
    outputJsonFiles: Record<string, JSONOutputFile<{ variantId: string }>>
  ) {
    const outputDir = appContext.projectConfigDir;
    // Generate Driver file

    const driverFile = new JavascriptOutputFile("index", outputDir);

    const filesGroupedByVariantId = Object.values(outputJsonFiles).reduce(
      (acc, file) => {
        const variantId = file.metadata.variantId
        acc[variantId] ??= [];
        acc[variantId].push(file);
        return acc;
      },
      {} as Record<string, OutputFile[]>
    );

    driverFile.content += this.generateImportStatments(outputJsonFiles);

    driverFile.content += `\n`;

    driverFile.content += this.generateDefaultExportString(
      filesGroupedByVariantId
    );

    return driverFile;
  }

  private generateImportStatments(
    outputJsonFiles: Record<string, JSONOutputFile<{ variantId: string }>>
  ) {
    let importStatements = "";
    for (const file of Object.values(outputJsonFiles)) {
      importStatements += this.codegenDefaultImport(
        this.sanitizeStringForJSVariableName(file.filename),
        `./${file.filenameWithExtension}`
      );
    }
    return importStatements;
  }

  private generateDefaultExportString(
    filesGroupedByVariantId: Record<string, OutputFile[]>
  ) {
    const variantIds = Object.keys(filesGroupedByVariantId);

    let defaultExportObjectString = "{\n";

    for (let i = 0; i < variantIds.length; i++) {
      const variantId = variantIds[i];
      const files = filesGroupedByVariantId[variantId];

      defaultExportObjectString += `${this.codegenPad(1)}"${variantId}": {\n`;
      for (const file of files) {
        defaultExportObjectString += `${this.codegenPad(2)}...${this.sanitizeStringForJSVariableName(
          file.filename
        )},\n`;
      }
      defaultExportObjectString += `${this.codegenPad(1)}}${
        i < variantIds.length - 1 ? `,\n` : `\n`
      }`;
    }

    defaultExportObjectString += `}`;

    return this.codegenDefaultExport(defaultExportObjectString);
  }
}
