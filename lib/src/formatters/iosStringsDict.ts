import BaseExportFormatter from "./shared/baseExport";
import IOSStringsDictOutputFile from "./shared/fileTypes/IOSStringsDictOutputFile";
import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullQueryParams,
} from "../http/types";
import OutputFile from "./shared/fileTypes/OutputFile";
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
