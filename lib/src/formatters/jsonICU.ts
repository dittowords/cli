import BaseExportFormatter from "./shared/baseExport";
import ICUOutputFile from "./shared/fileTypes/ICUOutputFile";
import {
  ExportComponentsJSONResponse,
  ExportTextItemsJSONResponse,
  PullQueryParams,
} from "../http/types";

export default class JSONICUFormatter extends BaseExportFormatter<
  ICUOutputFile<{ variantId: string }>,
  ExportTextItemsJSONResponse,
  ExportComponentsJSONResponse
> {
  protected exportFormat: PullQueryParams["format"] = "json_icu";

  protected createOutputFile(
    fileName: string,
    variantId: string,
    content: Record<string, unknown>
  ): void {
    this.outputFiles[fileName] ??= new ICUOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }
}
