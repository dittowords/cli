import BaseExportFormatter from "./shared/baseExport";
import IOSStringsDictOutputFile from "./shared/fileTypes/IOSStringsDictOutputFile";
import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullQueryParams,
} from "../http/types";
import appContext from "../utils/appContext";
export default class IOSStringsDictFormatter extends BaseExportFormatter<
  IOSStringsDictOutputFile<{ variantId: string }>,
  ExportTextItemsStringResponse,
  ExportComponentsStringResponse
> {
  protected exportFormat: PullQueryParams["format"] = "ios-stringsdict";

  protected createOutputFile(
    filePrefix: string,
    fileName: string,
    variantId: string,
    content: string
  ): void {
    const matchingLocale = this.getVariantLocale(variantId);
    this.outputFiles[fileName] ??= new IOSStringsDictOutputFile({
      filename: matchingLocale ? filePrefix : fileName, // don't append "___<variantId>"" when in locale directory
      path: this.getLocalesPath(variantId),
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }

  private getVariantLocale(
    variantId: string
  ): Record<string, string> | undefined {
    if (this.projectConfig.iosLocales) {
      return this.projectConfig.iosLocales.find(
        (localePair) => localePair[variantId]
      );
    }
    return undefined;
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
    const variantLocale = this.getVariantLocale(variantId);
    if (variantLocale) {
      path = `${appContext.outDir}/${variantLocale[variantId]}.lproj`;
    }
    return path;
  }
}
