import fetchText from "../http/textItems";
import { ComponentsResponse, ExportTextItemsResponse, PullQueryParams } from "../http/types";
import fetchComponents from "../http/components";
import fetchVariables, { Variable } from "../http/variables";
import BaseFormatter from "./shared/base";
import OutputFile from "./shared/fileTypes/OutputFile";
import { applyMixins } from "./shared";
import fetchProjects from "../http/projects";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import fetchVariants from "../http/variants";

interface TextItemsMap {
  [projectId: string]: {
    [variantId: string]: ExportTextItemsResponse
  }
}

type IOSStringsAPIData = {
  textItemsMap: TextItemsMap;
  components: ComponentsResponse;
  variablesById: Record<string, Variable>;
};

export default class IOSStringsFormatter extends applyMixins(
  BaseFormatter<IOSStringsOutputFile<{ variantId: string }>, IOSStringsAPIData>) {

  protected async fetchAPIData() {
    const textItemsMap = await this.fetchTextItemsMap();
    const components = await this.fetchComponents();
    const variables = await this.fetchVariables();

    const variablesById = variables.reduce((acc, variable) => {
      acc[variable.id] = variable;
      return acc;
    }, {} as Record<string, Variable>);

    return { textItemsMap, variablesById, components };
  }

  protected async transformAPIData(data: IOSStringsAPIData) {
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

    let results: OutputFile[] = [
      ...Object.values(this.outputFiles),
      this.variablesOutputFile,
    ]

    return results;
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
    let variants: { id: string }[] = this.output.variants ?? this.projectConfig.variants ?? [];

    const result: TextItemsMap = {};

    if (projects.length === 0) {
      projects = await fetchProjects(this.meta);
    }

    if (variants.some((variant) => variant.id === 'all')) {
      variants = await fetchVariants(this.meta);
    } else if (variants.length === 0) {
      variants = [{ id: 'base' }]
    }

    for (const project of projects) {
      result[project.id] = {};

      for (const variant of variants) {
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
   * Skips the fetch request if components field is not specified in config.
   * 
   * @returns components data
   */
  private async fetchComponents() {
    if (!this.projectConfig.components && !this.output.components) return [];
    const params = this.generateQueryParams("component");
    console.log('params', params)
    return await fetchComponents(params, this.meta);
  }

  private async fetchVariables() {
    return await fetchVariables(this.meta);
  }
}
