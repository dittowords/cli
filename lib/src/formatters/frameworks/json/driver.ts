import JavascriptOutputFile from "../../shared/fileTypes/JavascriptOutputFile";
import OutputFile from "../../shared/fileTypes/OutputFile";
import { applyMixins } from "../../shared";
import javascriptCodegenMixin from "../../mixins/javascriptCodegenMixin";
import JSONOutputFile, {
  JSONFileMetadata,
} from "../../shared/fileTypes/JSONOutputFile";
import BaseFramework from "./base";
import { OutputFileSourceKind } from "../../shared/baseExport";

/**
 * Generates the `index.js` driver file that re-exports every generated JSON file, grouped by
 * variant. Shared by the `i18next` and `vue-i18n` frameworks: the framework-specific parts
 * (plural keys, single-brace interpolation) are rendered by the API's `json_i18next` and
 * `json_vue_i18n` export formats, so the driver itself is the same for both.
 */
export default class JsonDriverFramework extends applyMixins(
  BaseFramework,
  javascriptCodegenMixin
) {
  process(outputJsonFiles: Record<string, JSONOutputFile<JSONFileMetadata>>) {
    const sortedFiles = sortDriverFiles(Object.values(outputJsonFiles));

    let moduleType: "commonjs" | "module" = "commonjs";
    if ("type" in this.output && this.output.type) {
      moduleType = this.output.type;
    }

    const driverFile = new JavascriptOutputFile({
      filename: "index",
      path: this.outDir,
    });

    const filesGroupedByVariantId = sortedFiles.reduce((acc, file) => {
      const variantId = file.metadata.variantId;
      acc[variantId] ??= [];
      acc[variantId].push(file);
      return acc;
    }, {} as Record<string, OutputFile[]>);

    if (moduleType === "module") {
      driverFile.content += this.generateImportStatements(sortedFiles);

      driverFile.content += `\n`;

      driverFile.content += this.codegenDefaultExport(
        this.generateExportedObjectString(filesGroupedByVariantId)
      );
    } else {
      driverFile.content += this.generateRequireStatements(sortedFiles);

      driverFile.content += `\n`;

      driverFile.content += this.codegenCommonJSModuleExports(
        this.generateExportedObjectString(filesGroupedByVariantId)
      );
    }

    return [driverFile];
  }

  /**
   * Generates the import statements for the driver file with type "module". One import per generated json file.
   * @param files - The output json files, in driver order.
   * @returns The import statements, stringified.
   */
  private generateImportStatements(files: JSONOutputFile<JSONFileMetadata>[]) {
    let importStatements = "";
    for (const file of files) {
      importStatements += this.codegenDefaultImport(
        this.sanitizeStringForJSVariableName(file.filename),
        `./${file.filenameWithExtension}`
      );
    }
    return importStatements;
  }

  /**
   * Generates the require statements for the driver file with type "commonjs". One require per generated json file.
   * @param files - The output json files, in driver order.
   * @returns The require statements, stringified.
   */
  private generateRequireStatements(files: JSONOutputFile<JSONFileMetadata>[]) {
    let requireStatements = "";
    for (const file of files) {
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

const SOURCE_KIND_ORDER: Record<OutputFileSourceKind, number> = {
  base: 0,
  project: 1,
  components: 2,
};

/**
 * Orders files for the driver: bases alphabetically by ID, then projects not connected to a
 * base alphabetically by ID, then components last. Within a source, files are ordered by
 * variant ID. This order is used for the imports/requires and for the spreads within each
 * variant, so when two files share a key, the later one wins predictably.
 */
function sortDriverFiles(files: JSONOutputFile<JSONFileMetadata>[]) {
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...files].sort(
    (a, b) =>
      SOURCE_KIND_ORDER[a.metadata.sourceKind] -
        SOURCE_KIND_ORDER[b.metadata.sourceKind] ||
      compare(a.metadata.sourceId ?? "", b.metadata.sourceId ?? "") ||
      compare(a.metadata.variantId, b.metadata.variantId)
  );
}
