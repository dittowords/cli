import JavascriptOutputFile from "../../shared/fileTypes/JavascriptOutputFile";
import OutputFile from "../../shared/fileTypes/OutputFile";
import { applyMixins } from "../../shared";
import javascriptCodegenMixin from "../../mixins/javascriptCodegenMixin";
import JSONOutputFile from "../../shared/fileTypes/JSONOutputFile";
import BaseFramework from "./base";

export default class VueI18nFramework extends applyMixins(
  BaseFramework,
  javascriptCodegenMixin
) {
  process(
    outputJsonFiles: Record<string, JSONOutputFile<{ variantId: string }>>
  ) {
    // vue-18n requires single mustaching for their json inputs, so we need to update the json
    for (const file of Object.values(outputJsonFiles)) {
      for (const key in file.content) {
        const content = file.content[key];
        if (typeof content === "string") {
          file.content[key] = content
            .replaceAll(/{{/g, "{")
            .replaceAll(/}}/g, "}");
        }
      }
    }

    let moduleType: "commonjs" | "module" = "commonjs";
    if ("type" in this.output && this.output.type) {
      moduleType = this.output.type;
    }

    const driverFile = new JavascriptOutputFile({
      filename: "index",
      path: this.outDir,
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

    if (moduleType === "module") {
      driverFile.content += this.generateImportStatements(outputJsonFiles);

      driverFile.content += `\n`;

      driverFile.content += this.codegenDefaultExport(
        this.generateExportedObjectString(filesGroupedByVariantId)
      );
    } else {
      driverFile.content += this.generateRequireStatements(outputJsonFiles);

      driverFile.content += `\n`;

      driverFile.content += this.codegenCommonJSModuleExports(
        this.generateExportedObjectString(filesGroupedByVariantId)
      );
    }

    return [driverFile];
  }

  /**
   * Generates the import statements for the driver file with type "module". One import per generated json file.
   * @param outputJsonFiles - The output json files.
   * @returns The import statements, stringified.
   */
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
   * Generates the require statements for the driver file with type "commonjs". One require per generated json file.
   * @param outputJsonFiles - The output json files.
   * @returns The require statements, stringified.
   */
  private generateRequireStatements(
    outputJsonFiles: Record<string, JSONOutputFile<{ variantId: string }>>
  ) {
    let requireStatements = "";
    for (const file of Object.values(outputJsonFiles)) {
      requireStatements += this.codegenDefaultRequire(
        this.sanitizeStringForJSVariableName(file.filename),
        `./${file.filenameWithExtension}`
      );
    }
    return requireStatements;
  }

  /**
   * Generates the default export for the driver file. By default this is an object with the json imports grouped by variant id.
   * @param filesGroupedByVariantId - The files grouped by variant id.
   * @returns The default export, stringified.
   */
  private generateExportedObjectString(
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

    return defaultExportObjectString;
  }
}
