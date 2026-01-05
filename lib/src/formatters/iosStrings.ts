import BaseExportFormatter from "./shared/baseExport";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullQueryParams,
} from "../http/types";

export default class IOSStringsFormatter extends BaseExportFormatter<
  IOSStringsOutputFile<{ variantId: string }>,
  ExportTextItemsStringResponse,
  ExportComponentsStringResponse
> {
  protected exportFormat: PullQueryParams["format"] = "ios-strings";

  protected createOutputFile(
    fileName: string,
    variantId: string,
    content: string
  ): void {
    this.outputFiles[fileName] ??= new IOSStringsOutputFile({
      filename: fileName,
      path: this.getLocalesPath(variantId),
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }
}
