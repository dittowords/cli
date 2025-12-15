import BaseExportFormatter from "./shared/baseExport";
import IOSStringsDictOutputFile from "./shared/fileTypes/IOSStringsDictOutputFile";
import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullQueryParams,
} from "../http/types";
export default class IOSStringsDictFormatter extends BaseExportFormatter<
  IOSStringsDictOutputFile<{ variantId: string }>,
  ExportTextItemsStringResponse,
  ExportComponentsStringResponse
> {
  protected exportFormat: PullQueryParams["format"] = "ios-stringsdict";

  protected createOutputFile(
    fileName: string,
    variantId: string,
    content: string
  ): void {
    this.outputFiles[fileName] ??= new IOSStringsDictOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }
}
