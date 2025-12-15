import { PullQueryParams } from "../http/types";
import IOSStringsDictOutputFile from "./shared/fileTypes/IOSStringsDictOutputFile";
import BaseExportFormatter from "./shared/baseExport";
export default class IOSStringsDictFormatter extends BaseExportFormatter<
  IOSStringsDictOutputFile<{ variantId: string }>
> {
  public exportFormat: PullQueryParams["format"] = "ios-stringsdict";

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
