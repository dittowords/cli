import {
  PullQueryParams,
  ExportTextItemsResponse,
  ExportComponentsResponse,
} from "../../http/types";
import { exportTextItems } from "../../http/textItems";
import { exportComponents } from "../../http/components";
import BaseFormatter from "./base";
import fetchProjects from "../../http/projects";
import fetchVariants from "../../http/variants";
import OutputFile from "./fileTypes/OutputFile";
import { BASE_VARIANT_ID } from "../../utils/constants";

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
  TOutputFile extends ExportOutputFile<{ variantId: string }>
> extends BaseFormatter<TOutputFile, ExportFormatAPIData> {
  protected abstract exportFormat: PullQueryParams["format"];
  private variants: { id: string }[] = [];

  protected abstract createOutputFile(
    filePrefix: string,
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
            this.createOutputFile(
              projectId,
              fileName,
              variantId,
              textItemsFileContent
            );
          }
        );
      }
    );

    Object.entries(data.componentsMap).forEach(
      ([variantId, componentsFileContent]) => {
        const filePrefix = "components";
        const fileName = `${filePrefix}___${variantId || BASE_VARIANT_ID}`;
        this.createOutputFile(
          filePrefix,
          fileName,
          variantId,
          componentsFileContent
        );
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
      variants.push({ id: BASE_VARIANT_ID });
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
            statuses: super.generateTextItemPullFilter().statuses,
          }),
          variantId,
          format: this.exportFormat,
        };
        const addVariantToProjectMap = exportTextItems(params, this.meta).then(
          (textItemsFileContent) => {
            result[project.id][variant.id] = textItemsFileContent;
          }
        );
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
      const { folders, statuses } = super.generateComponentPullFilter();
      const params: PullQueryParams = {
        // gets folders from base component pull filters, overwrites variants with just this iteration's variant
        ...super.generateQueryParams({ folders, statuses }),
        variantId,
        format: this.exportFormat,
      };
      const addVariantToMap = exportComponents(params, this.meta).then(
        (componentsFileContent) => {
          result[variant.id] = componentsFileContent;
        }
      );
      fetchFileContentRequests.push(addVariantToMap);
    }

    await Promise.all(fetchFileContentRequests);
    return result;
  }
}
