import BaseExportFormatter from "./shared/baseExport";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullQueryParams,
} from "../http/types";
import OutputFile from "./shared/fileTypes/OutputFile";

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

  protected async writeFiles(files: OutputFile[]): Promise<void> {
    if (this.projectConfig.iosLocales) {
      const swiftDriverFile = await this.getSwiftDriverFile();
      files.push(swiftDriverFile);
    }
    await super.writeFiles(files);
  }
}
