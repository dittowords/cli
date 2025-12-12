import fetchText from "../http/textItems";
import { ExportComponentsResponse, ExportTextItemsResponse, PullQueryParams, Variant } from "../http/types";
import fetchComponents from "../http/components";
import BaseFormatter from "./shared/base";
import { applyMixins } from "./shared";
import fetchProjects from "../http/projects";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import fetchVariants from "../http/variants";

interface ComponentsMap {
  [variantId: string]: ExportComponentsResponse
}
interface TextItemsMap {
  [projectId: string]: {
    [variantId: string]: ExportTextItemsResponse
  }
}

type IOSStringsAPIData = {
  textItemsMap: TextItemsMap;
  componentsMap: ComponentsMap;
};

export default class IOSStringsFormatter extends applyMixins(
  BaseFormatter<IOSStringsOutputFile<{ variantId: string }>, IOSStringsAPIData>) {
  private variants: { id: string }[] = [];

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
  protected transformAPIData(data: IOSStringsAPIData) {
    Object.entries(data.textItemsMap).forEach(([projectId, projectVariants]) => {
      Object.entries(projectVariants).forEach(([variantId, iosStringsFile]) => {
        const fileName = `${projectId}___${variantId || "base"}`;
        this.outputFiles[fileName] ??= new IOSStringsOutputFile({
          filename: fileName,
          path: this.outDir,
          metadata: { variantId: variantId || "base" },
          content: iosStringsFile
        });
      });
    });

    Object.entries(data.componentsMap).forEach(([variantId, iosStringsFile]) => {
      const fileName = `components___${variantId || "base"}`;
      this.outputFiles[fileName] ??= new IOSStringsOutputFile({
        filename: fileName,
        path: this.outDir,
        metadata: { variantId: variantId || "base" },
        content: iosStringsFile
      });
    })

    return Object.values(this.outputFiles);
  }

  /**
   * Sets variants based on configuration
   * - Fetches from API if "all" configured
   * - Adds "base" variant by default if none configured
   */
  private async fetchVariants(): Promise<void> {
    let variants: { id: string }[] = this.output.variants ?? this.projectConfig.variants ?? [];
    if (variants.some((variant) => variant.id === 'all')) {
      variants = await fetchVariants(this.meta);
    } else if (variants.length === 0) {
      variants = [{ id: 'base' }]
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
    let projects: { id: string }[] = this.output.projects ?? this.projectConfig.projects ?? [];

    const result: TextItemsMap = {};

    if (projects.length === 0) {
      projects = await fetchProjects(this.meta);
    }

    for (const project of projects) {
      result[project.id] = {};

      for (const variant of this.variants) {
        // map "base" to undefined, as by default export endpoint returns base variant
        const variantsParam = variant.id === 'base' ? undefined : [{ id: variant.id }]
        const params: PullQueryParams = { 
          ...super.generateQueryParams("textItem", { projects: [{ id: project.id }], variants: variantsParam }),
          format: 'ios-strings'
        };
        const iosStringsFile = await fetchText<ExportTextItemsResponse>(params, this.meta);
        result[project.id][variant.id] = iosStringsFile;
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
      const variantsParam = variant.id === 'base' ? undefined : [{ id: variant.id }]
      const params: PullQueryParams = { 
        ...super.generateQueryParams("component", { variants: variantsParam }),
        format: 'ios-strings'
      };
      const iosStringsFile = await fetchComponents<ExportComponentsResponse>(params, this.meta);
      result[variant.id] = iosStringsFile;
    }

    return result;
  }
}
