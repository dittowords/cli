import BaseExportFormatter from "./shared/baseExport";
import AndroidOutputFile from "./shared/fileTypes/AndroidOutputFile";
import { PullQueryParams } from "../http/types";
import { BASE_VARIANT_ID } from "../utils/constants";

export default class AndroidXMLFormatter extends BaseExportFormatter<
  AndroidOutputFile<{ variantId: string }>
> {
  protected exportFormat: PullQueryParams["format"] = "android";

  protected createOutputFile(
    _filePrefix: string,
    fileName: string,
    variantId: string,
    content: string
  ): void {
    this.outputFiles[fileName] ??= new AndroidOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || BASE_VARIANT_ID },
      content: content,
    });
  }
}
