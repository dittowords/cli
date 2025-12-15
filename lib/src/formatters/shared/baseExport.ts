import fetchText from "../../http/textItems";
import {
  ExportComponentsResponse,
  ExportTextItemsResponse,
  PullQueryParams,
} from "../../http/types";
import fetchComponents from "../../http/components";
import BaseFormatter from "./base";
import fetchProjects from "../../http/projects";
import fetchVariants from "../../http/variants";
import OutputFile from "./fileTypes/OutputFile";

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
  string,
  MetadataType
>;

export default class BaseExportFormatter<
  TOutputFile extends ExportOutputFile<{ variantId: string }>
> extends BaseFormatter<TOutputFile, ExportFormatAPIData> {
  protected exportFormat: PullQueryParams["format"];
  private variants: { id: string }[] = [];

  // required by children
  protected createOutputFile(
    fileName: string,
    variantId: string,
    content: string
  ): void {}

  protected async fetchAPIData() {
    await this.fetchVariants();
    const textItemsMap = await this.fetchTextItemsMap();
    const componentsMap = await this.fetchComponentsMap();

    return { textItemsMap, componentsMap };
  }

  /**
   * For each project/variant permutation and its fetched .strings data,
   * create a new file with the expected naming
   *
   * @returns {OutputFile[]} List of Output Files
   */
  protected transformAPIData(data: ExportFormatAPIData): TOutputFile[] {
    Object.entries(data.textItemsMap).forEach(
      ([projectId, projectVariants]) => {
        Object.entries(projectVariants).forEach(
          ([variantId, textItemsFileContent]) => {
            const fileName = `${projectId}___${variantId || "base"}`;
            this.createOutputFile(fileName, variantId, textItemsFileContent);
          }
        );
      }
    );

    Object.entries(data.componentsMap).forEach(
      ([variantId, componentsFileContent]) => {
        const fileName = `components___${variantId || "base"}`;
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
      variants = [{ id: "base" }];
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

    for (const project of projects) {
      result[project.id] = {};

      for (const variant of this.variants) {
        // map "base" to undefined, as by default export endpoint returns base variant
        const variantsParam =
          variant.id === "base" ? undefined : [{ id: variant.id }];
        const params: PullQueryParams = {
          ...super.generateQueryParams("textItem", {
            projects: [{ id: project.id }],
            variants: variantsParam,
          }),
          format: this.exportFormat,
        };
        const textItemsFileContent = await fetchText<ExportTextItemsResponse>(
          params,
          this.meta
        );
        result[project.id][variant.id] = textItemsFileContent;
      }
    }

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

    for (const variant of this.variants) {
      // map "base" to undefined, as by default export endpoint returns base variant
      const variantsParam =
        variant.id === "base" ? undefined : [{ id: variant.id }];
      const params: PullQueryParams = {
        ...super.generateQueryParams("component", { variants: variantsParam }),
        format: this.exportFormat,
      };
      const componentsFileContent =
        await fetchComponents<ExportComponentsResponse>(params, this.meta);
      result[variant.id] = componentsFileContent;
    }

    return result;
  }
}
