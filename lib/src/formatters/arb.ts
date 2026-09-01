import BaseExportFormatter from "./shared/baseExport";
import ARBOutputFile from "./shared/fileTypes/ARBOutputFile";
import { PullQueryParams } from "../http/types";
import { BASE_VARIANT_ID } from "../utils/constants";

export default class ARBFormatter extends BaseExportFormatter<
  ARBOutputFile<{ variantId: string }>
> {
  protected exportFormat: PullQueryParams["format"] = "arb";

  protected createOutputFile(
    _filePrefix: string,
    fileName: string,
    variantId: string,
    content: Record<string, unknown>
  ): void {
    this.outputFiles[fileName] ??= new ARBOutputFile({
      filename: fileName,
      path: this.outDir,
      metadata: { variantId: variantId || BASE_VARIANT_ID },
      content: content,
    });
  }
}
