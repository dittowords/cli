import BaseExportFormatter, { ExportFormatAPIData } from "./baseExport";
import JSONOutputFile from "./fileTypes/JSONOutputFile";
import OutputFile from "./fileTypes/OutputFile";
import { PullQueryParams, VARIABLES_USED_KEY } from "../../http/types";
import fetchVariables, { Variable } from "../../http/variables";
import { BASE_VARIANT_ID } from "../../utils/constants";
import { getFrameworkProcessor } from "../frameworks/json";

/**
 * Shared behavior for the key/value JSON outputs (`json`, `json` + `i18next`,
 * `json` + `vue-i18n`). In addition to the per-project/variant JSON files, these also write
 * `variables.json` and, when a framework is configured, an `index.js` driver file.
 */
export default abstract class BaseJSONFormatter extends BaseExportFormatter<
  JSONOutputFile<{ variantId: string }>
> {
  private workspaceVariables: Variable[] = [];
  private usedVariableNames = new Set<string>();

  protected exportQueryParams(): Partial<PullQueryParams> {
    return {
      // Omit the `__variant-name` / `__variant-description` metadata from the export
      excludeVariantMetadata: "true",
      // Request `__variables_used` be included in the export for use in creating the variables.json file
      // This key is ultimately stripped from the final JSON files
      includeVariableSummary: "true",
    };
  }

  protected createOutputFile(
    _filePrefix: string,
    fileName: string,
    variantId: string,
    content: Record<string, string> & { [VARIABLES_USED_KEY]?: string[] }
  ): void {
    // The variable summary is metadata for the CLI, not actual Ditto text
    // This is used internally for processing only, and should not be included in the final output files.
    // Absent on an empty export: the API only adds the summary when the file has content.
    const { [VARIABLES_USED_KEY]: variablesUsed = [], ...exportedText } =
      content;

    // A project/variant with no matching text comes back as an empty object.
    // If there's no exported text, skip writing the file entirely.
    if (Object.keys(exportedText).length === 0) return;

    for (const name of variablesUsed) {
      this.usedVariableNames.add(name);
    }

    this.outputFiles[fileName] ??= new JSONOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || BASE_VARIANT_ID },
      content: exportedText,
    });
  }

  protected async fetchAPIData(): Promise<ExportFormatAPIData> {
    // Send the variables request in parallel with all the export requests.
    const [data, variables] = await Promise.all([
      super.fetchAPIData(),
      fetchVariables(this.meta),
    ]);
    this.workspaceVariables = variables;
    return data;
  }

  protected transformAPIData(data: ExportFormatAPIData): OutputFile[] {
    // Runs createOutputFile for every response, which collects usedVariableNames.
    const files = super.transformAPIData(data);

    // A variable's name doubles as its developer ID, which is what the exported text
    // references and what variables.json is keyed by.
    for (const variable of this.workspaceVariables) {
      if (this.usedVariableNames.has(variable.name)) {
        this.variablesOutputFile.content[variable.id] = variable.data;
      }
    }
    files.push(this.variablesOutputFile);

    if (this.output.framework) {
      files.push(
        ...getFrameworkProcessor(this.output).process(this.outputFiles)
      );
    }

    return files;
  }
}
