import BaseExportFormatter from "./shared/baseExport";
import AndroidOutputFile from "./shared/fileTypes/AndroidOutputFile";
import { PullQueryParams } from "../http/types";

export default class AndroidXMLFormatter extends BaseExportFormatter<
  AndroidOutputFile<{ variantId: string }>
> {
  protected exportFormat: PullQueryParams["format"] = "android";

  protected createOutputFile(
    fileName: string,
    variantId: string,
    content: string
  ): void {
    this.outputFiles[fileName] ??= new AndroidOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }
}
