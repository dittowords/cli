import fetchText from "../../http/textItems";
import {
  PullQueryParams,
  ExportTextItemsResponse,
  ExportComponentsResponse,
} from "../../http/types";
import fetchComponents from "../../http/components";
import BaseFormatter from "./base";
import fetchProjects from "../../http/projects";
import fetchVariants from "../../http/variants";
import OutputFile from "./fileTypes/OutputFile";
import appContext from "../../utils/appContext";
import generateSwiftDriver from "../../http/cli";
import SwiftOutputFile from "./fileTypes/SwiftOutputFile";

const BASE_VARIANT_ID = "base";

interface ComponentsMap {
  [variantId: string]: ExportComponentsResponse;
}
interface TextItemsMap {
  [projectId: string]: {
    [variantId: string]: ExportTextItemsResponse;
  };
}

type ExportFormatAPIData = {
  textItemsMap: TextItemsMap;
  componentsMap: ComponentsMap;
};

type ExportOutputFile<MetadataType extends { variantId: string }> = OutputFile<
  string | Record<string, unknown>,
  MetadataType
>;

/**
 * Base Class for File Formats That Leverage API /v2/components/export and /v2/textItems/export endpoints
 * These file formats fetch their file data directly from the API and write to files, unlike in the case of
 * default /v2/textItems + /v2/components JSON, we cannot perform any manipulation on the data itself
 */
export default abstract class BaseExportFormatter<
  TOutputFile extends ExportOutputFile<{ variantId: string }>,
  // The response types below correspond to the file data returned from the export endpoint and what will ultimately be written directly to the /ditto directory
  // ios-strings, ios-stringsdict, and android formats are all strings while json_icu is { [developerId: string]: string } JSON Structure
  TTextItemsResponse extends ExportTextItemsResponse,
  TComponentsResponse extends ExportComponentsResponse
> extends BaseFormatter<TOutputFile, ExportFormatAPIData> {
  protected abstract exportFormat: PullQueryParams["format"];
  private variants: { id: string }[] = [];

  protected abstract createOutputFile(
    fileName: string,
    variantId: string,
    content: string | Record<string, unknown>
  ): void;

  protected async fetchAPIData() {
    await this.fetchVariants();
    const [textItemsMap, componentsMap] = await Promise.all([
      this.fetchTextItemsMap(),
      this.fetchComponentsMap(),
    ]);

    return { textItemsMap, componentsMap };
  }

  /**
   * For each project/variant permutation and its fetched file data,
   * create a new file with the expected project/variant name
   *
   * @returns {OutputFile[]} List of Output Files
   */
  protected transformAPIData(data: ExportFormatAPIData): TOutputFile[] {
    Object.entries(data.textItemsMap).forEach(
      ([projectId, projectVariants]) => {
        Object.entries(projectVariants).forEach(
          ([variantId, textItemsFileContent]) => {
            const fileName = `${projectId}___${variantId || BASE_VARIANT_ID}`;
            this.createOutputFile(fileName, variantId, textItemsFileContent);
          }
        );
      }
    );

    Object.entries(data.componentsMap).forEach(
      ([variantId, componentsFileContent]) => {
        const fileName = `components___${variantId || BASE_VARIANT_ID}`;
        this.createOutputFile(fileName, variantId, componentsFileContent);
      }
    );

    return Object.values(this.outputFiles);
  }

  /**
   * Sets variants based on configuration
   * - Fetches from API if "all" configured
   * - Adds "base" variant by default if none configured
   */
  private async fetchVariants(): Promise<void> {
    let variants: { id: string }[] =
      this.output.variants ?? this.projectConfig.variants ?? [];
    if (variants.some((variant) => variant.id === "all")) {
      variants = await fetchVariants(this.meta);
    } else if (variants.length === 0) {
      variants = [{ id: BASE_VARIANT_ID }];
    }

    this.variants = variants;
  }

  /**
   * Fetches text item data via API for each configured project and variant
   * in this output
   *
   * @returns text items mapped to their respective variant and project
   */
  private async fetchTextItemsMap(): Promise<TextItemsMap> {
    if (!this.projectConfig.projects && !this.output.projects) return {};
    let projects: { id: string }[] =
      this.output.projects ?? this.projectConfig.projects ?? [];

    const result: TextItemsMap = {};

    if (projects.length === 0) {
      projects = await fetchProjects(this.meta);
    }

    const fetchFileContentRequests = [];

    for (const project of projects) {
      result[project.id] = {};

      for (const variant of this.variants) {
        // map "base" to undefined, as by default export endpoint returns base variant
        const variantId =
          variant.id === BASE_VARIANT_ID ? undefined : variant.id;
        const params: PullQueryParams = {
          ...super.generateQueryParams({
            projects: [{ id: project.id }],
          }),
          variantId,
          format: this.exportFormat,
        };
        const addVariantToProjectMap = fetchText<TTextItemsResponse>(
          params,
          this.meta
        ).then((textItemsFileContent) => {
          result[project.id][variant.id] = textItemsFileContent;
        });
        fetchFileContentRequests.push(addVariantToProjectMap);
      }
    }

    await Promise.all(fetchFileContentRequests);

    return result;
  }

  /**
   * Fetches component data via API.
   * If individual variants configured, fetch by each otherwise fetch for all
   * Skips the fetch request if components field is not specified in config.
   *
   * @returns components data
   */
  private async fetchComponentsMap(): Promise<ComponentsMap> {
    if (!this.projectConfig.components && !this.output.components) return {};
    const result: ComponentsMap = {};

    const fetchFileContentRequests = [];

    for (const variant of this.variants) {
      // map "base" to undefined, as by default export endpoint returns base variant
      const variantId = variant.id === BASE_VARIANT_ID ? undefined : variant.id;
      const folderFilters = super.generateComponentPullFilter().folders;
      const params: PullQueryParams = {
        // gets folders from base component pull filters, overwrites variants with just this iteration's variant
        ...super.generateQueryParams({
          folders: folderFilters,
        }),
        variantId,
        format: this.exportFormat,
      };
      const addVariantToMap = fetchComponents<TComponentsResponse>(
        params,
        this.meta
      ).then((componentsFileContent) => {
        result[variant.id] = componentsFileContent;
      });
      fetchFileContentRequests.push(addVariantToMap);
    }

    await Promise.all(fetchFileContentRequests);
    return result;
  }

  /*************************************************
   * IOS Specific
   *************************************************/

  /**
   * If config.iosLocales configured, writes .strings files to root project outDir instead of the specific output
   * This is because with both .strings and .stringsdict configured the locale files can get "overwritten" as far as
   * the Ditto.swift file is concerned. We need to have all .strings and .stringsdict files in one directory
   *
   * Any variants not-configured in the iosLocales will get written to the output's outDir as expected (if that output outDir is configured)
   */
  protected getLocalesPath(variantId: string) {
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
