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
    let path = this.outDir;
    if (this.projectConfig.iosLocales) {
      const locale = this.projectConfig.iosLocales.find(
        (localePair) => localePair[variantId]
      );
      if (locale) {
        path = path.concat(`/${locale[variantId]}.lproj`);
      }
    }
    this.outputFiles[fileName] ??= new IOSStringsOutputFile({
      filename: fileName,
      path: path,
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }
}
