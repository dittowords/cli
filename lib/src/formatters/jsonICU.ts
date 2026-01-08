import BaseExportFormatter from "./shared/baseExport";
import ICUOutputFile from "./shared/fileTypes/ICUOutputFile";
import { PullQueryParams } from "../http/types";
import { BASE_VARIANT_ID } from "../utils/constants";

export default class JSONICUFormatter extends BaseExportFormatter<
  ICUOutputFile<{ variantId: string }>
> {
  protected exportFormat: PullQueryParams["format"] = "json_icu";

  protected createOutputFile(
    _filePrefix: string,
    fileName: string,
    variantId: string,
    content: Record<string, unknown>
  ): void {
    this.outputFiles[fileName] ??= new ICUOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || BASE_VARIANT_ID },
      content: content,
    });
  }
}
