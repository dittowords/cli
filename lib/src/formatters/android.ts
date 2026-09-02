import BaseExportFormatter from "./shared/baseExport";
import AndroidOutputFile from "./shared/fileTypes/AndroidOutputFile";
import { PullQueryParams } from "../http/types";
import appContext from "../utils/appContext";
import { BASE_VARIANT_ID } from "../utils/constants";

export default class AndroidXMLFormatter extends BaseExportFormatter<
  AndroidOutputFile<{ variantId: string }>
> {
  protected exportFormat: PullQueryParams["format"] = "android";

  protected createOutputFile(
    filePrefix: string,
    fileName: string,
    variantId: string,
    content: string
  ): void {
    const isLocaleStructured = this.isLocaleStructured(variantId);
    this.outputFiles[fileName] ??= new AndroidOutputFile({
      filename: isLocaleStructured ? filePrefix : fileName, // don't append "___<variantId>"" when in locale directory
      path: this.getLocalesPath(variantId),
      metadata: { variantId: variantId || BASE_VARIANT_ID },
      content: content,
    });
  }

  private getVariantLocale(
    variantId: string
  ): Record<string, string> | undefined {
    if (this.projectConfig.androidLocales) {
      return this.projectConfig.androidLocales.find(
        (localePair) => localePair[variantId]
      );
    }
    return undefined;
  }

  /**
   * Unlike iOS, Android resource sets have an implicit default (unqualified `values`)
   * directory, so the base variant is always locale-structured once androidLocales is
   * configured, even without an explicit "base" entry. Other variants must be mapped.
   */
  private isLocaleStructured(variantId: string): boolean {
    if (!this.projectConfig.androidLocales) return false;
    const isBaseVariant = !variantId || variantId === BASE_VARIANT_ID;
    return isBaseVariant || Boolean(this.getVariantLocale(variantId));
  }

  /**
   * If config.androidLocales configured, writes .xml files to config.androidLocalesOutDir
   * (or the root project outDir if unset) using Android's expected `values`/`values-<locale>`
   * resource directory structure instead of the specific output's outDir.
   *
   * The base variant always maps to `values` (Android's default/unqualified resource set).
   * Any other variants not configured in androidLocales will get written to the output's
   * outDir as expected (if that output outDir is configured)
   */
  private getLocalesPath(variantId: string) {
    if (!this.isLocaleStructured(variantId)) {
      return this.outDir;
    }
    const localesOutDir =
      this.projectConfig.androidLocalesOutDir ?? appContext.outDir;
    const isBaseVariant = !variantId || variantId === BASE_VARIANT_ID;
    if (isBaseVariant) {
      return `${localesOutDir}/values`;
    }
    const variantLocale = this.getVariantLocale(variantId);
    const qualifier = this.toAndroidLocaleQualifier(variantLocale![variantId]);
    return `${localesOutDir}/values-${qualifier}`;
  }

  /**
   * Converts a locale code (e.g. "es-MX") into Android's resource-qualifier folder
   * name (e.g. "es-rMX"). Android requires a 2-letter region subtag to be prefixed
   * with a lowercase "r" — "values-es-MX" is not a valid qualifier and Android
   * silently ignores the folder, so this must not be passed through as-is.
   */
  private toAndroidLocaleQualifier(locale: string): string {
    const [language, region] = locale.split(/[-_]/);
    if (region && /^[A-Za-z]{2}$/.test(region)) {
      return `${language.toLowerCase()}-r${region.toUpperCase()}`;
    }
    return locale;
  }
}
