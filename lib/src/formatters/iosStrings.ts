import BaseExportFormatter from "./shared/baseExport";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import { PullQueryParams } from "../http/types";
export default class IOSStringsFormatter extends BaseExportFormatter<
  IOSStringsOutputFile<{ variantId: string }>
> {
  protected exportFormat: PullQueryParams["format"] = "ios-strings";

  protected createOutputFile(
    fileName: string,
    variantId: string,
    content: string
  ): void {
    this.outputFiles[fileName] ??= new IOSStringsOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }
}
