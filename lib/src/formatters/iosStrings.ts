import BaseExportFormatter from "./shared/baseExport";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";

import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullQueryParams,
} from "../http/types";
import appContext from "../utils/appContext";

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

  /**
   * If config.iosLocales configured, writes .strings files to root project outDir instead of the specific output
   * This is because with both .strings and .stringsdict configured the locale files can get "overwritten" as far as
   * the Ditto.swift file is concerned. We need to have all .strings and .stringsdict files in one directory
   *
   * Any variants not-configured in the iosLocales will get written to the output's outDir as expected (if that output outDir is configured)
   */
  private getLocalesPath(variantId: string) {
    let path = this.outDir;
    if (this.projectConfig.iosLocales) {
      const locale = this.projectConfig.iosLocales.find(
        (localePair) => localePair[variantId]
      );
      if (locale) {
        path = `${appContext.outDir}/${locale[variantId]}.lproj`;
      }
    }
    return path;
  }
}
