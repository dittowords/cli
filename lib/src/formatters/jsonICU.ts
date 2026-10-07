import BaseExportFormatter from "./shared/baseExport";
import ICUOutputFile from "./shared/fileTypes/ICUOutputFile";
import { ExportFormat, PullQueryParams } from "../http/types";
import { BASE_VARIANT_ID } from "../utils/constants";

export default class JSONICUFormatter extends BaseExportFormatter<
  ICUOutputFile<{ variantId: string }>
> {
  protected exportFormat: ExportFormat = "json_icu";

  // By default, the API stamps `__variant-name` / `__variant-description` onto ICU variant exports.
  // These are not needed for CLI processing and should not be written in to the CLI exported files.
  protected exportQueryParams(): Partial<PullQueryParams> {
    return { excludeVariantMetadata: "true" };
  }

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
