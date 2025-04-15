import appContext from "../../utils/appContext";
import JavascriptOutputFile from "../shared/fileTypes/JavascriptOutputFile";
import OutputFile from "../shared/fileTypes/OutputFile";
import { applyMixins } from "../shared";
import javascriptCodegenMixin from "../mixins/javascriptCodegenMixin";
import JSONOutputFile from "../shared/fileTypes/JSONOutputFile";
import BaseFramework from "./base";

export default class I18NextFramework extends applyMixins(
  BaseFramework,
  javascriptCodegenMixin
) {
  process(
    outputJsonFiles: Record<string, JSONOutputFile<{ variantId: string }>>
  ) {
    const outputDir = appContext.projectConfigDir;
    // Generate Driver file

    const driverFile = new JavascriptOutputFile({
      filename: "index",
      path: outputDir,
    });

    const filesGroupedByVariantId = Object.values(outputJsonFiles).reduce(
      (acc, file) => {
        const variantId = file.metadata.variantId;
        acc[variantId] ??= [];
        acc[variantId].push(file);
        return acc;
      },
      {} as Record<string, OutputFile[]>
    );

    driverFile.content += this.generateImportStatements(outputJsonFiles);

    driverFile.content += `\n`;

    driverFile.content += this.generateDefaultExportString(
      filesGroupedByVariantId
    );

    return [driverFile];
  }

  private generateImportStatements(
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

  /**
   * Generates the default export for the driver file. By default this is an object with the json imports grouped by variant id.
   * @param filesGroupedByVariantId - The files grouped by variant id.
   * @returns The default export, stringified.
   */
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
        defaultExportObjectString += `${this.codegenPad(
          2
        )}...${this.sanitizeStringForJSVariableName(file.filename)},\n`;
      }
      defaultExportObjectString += `${this.codegenPad(1)}}${
        i < variantIds.length - 1 ? `,\n` : `\n`
      }`;
    }

    defaultExportObjectString += `}`;

    return this.codegenDefaultExport(defaultExportObjectString);
  }
}
