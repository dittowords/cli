import {
  PullQueryParams,
  ExportFormat,
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
import { mapWithConcurrency } from "../../utils/concurrency";

interface ComponentsMap {
  [variantId: string]: ExportComponentsResponse;
}
interface TextItemsMap {
  [projectId: string]: {
    [variantId: string]: ExportTextItemsResponse;
  };
}

export type ExportFormatAPIData = {
  textItemsMap: TextItemsMap;
  componentsMap: ComponentsMap;
};

type ExportOutputFile<MetadataType extends { variantId: string }> = OutputFile<
  string | Record<string, unknown>,
  MetadataType
>;

type ExportRequest =
  | {
      kind: "textItems";
      projectId: string;
      variantId: string;
      params: PullQueryParams;
    }
  | { kind: "components"; variantId: string; params: PullQueryParams };

/**
 * Base class for every output format. All formats are rendered by the API's
 * /v2/textItems/export and /v2/components/export endpoints -- the CLI decides which files to
 * produce, requests each one, and writes the response through.
 */
export default abstract class BaseExportFormatter<
  TOutputFile extends ExportOutputFile<{ variantId: string }>
> extends BaseFormatter<TOutputFile, ExportFormatAPIData> {
  protected abstract exportFormat: ExportFormat;
  protected variants: { id: string }[] = [];

  protected abstract createOutputFile(
    filePrefix: string,
    fileName: string,
    variantId: string,
    content: string | Record<string, unknown>
  ): void;

  /**
   * Format-specific query params added to every export request this output makes.
   * Can be overridden by subclasses to add format-specific query parameters to every export request of that format.
   */
  protected exportQueryParams(): Partial<PullQueryParams> {
    return {};
  }

  /**
   * Fetches every file this output writes.
   *
   * Text item and component requests share one bounded pool rather than each fanning out on
   * its own, so the concurrency limit holds across the whole output and not per entity type.
   */
  protected async fetchAPIData(): Promise<ExportFormatAPIData> {
    await this.fetchVariants();

    const requests: ExportRequest[] = [
      ...(await this.buildTextItemRequests()),
      ...this.buildComponentRequests(),
    ];

    const responses = await mapWithConcurrency(requests, (request) =>
      request.kind === "textItems"
        ? exportTextItems(request.params, this.meta)
        : exportComponents(request.params, this.meta)
    );

    const textItemsMap: TextItemsMap = {};
    const componentsMap: ComponentsMap = {};
    requests.forEach((request, index) => {
      if (request.kind === "textItems") {
        textItemsMap[request.projectId] ??= {};
        textItemsMap[request.projectId][request.variantId] = responses[index];
      } else {
        componentsMap[request.variantId] = responses[index];
      }
    });

    return { textItemsMap, componentsMap };
  }

  /**
   * For each project/variant permutation and its fetched file data,
   * create a new file with the expected project/variant name
   *
   * @returns {OutputFile[]} List of Output Files
   */
  protected transformAPIData(data: ExportFormatAPIData): OutputFile[] {
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
  protected async fetchVariants(): Promise<void> {
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
   * One text item export request per configured project and variant.
   * Skipped entirely if no projects field is present in the config.
   */
  private async buildTextItemRequests(): Promise<ExportRequest[]> {
    if (!this.projectConfig.projects && !this.output.projects) return [];
    let projects: { id: string }[] =
      this.output.projects ?? this.projectConfig.projects ?? [];

    // projects: [] corresponds to exporting every project in the workspace
    // In this case, we need to fetch the whole list of projects so we can fire individual requests for each one
    if (projects.length === 0) {
      projects = await fetchProjects(this.meta);
    }

    const { statuses, integrated, tags } = super.generateTextItemPullFilter();
    const requests: ExportRequest[] = [];

    for (const project of projects) {
      for (const variant of this.variants) {
        requests.push({
          kind: "textItems",
          projectId: project.id,
          variantId: variant.id,
          params: this.exportParams(
            { projects: [{ id: project.id }], statuses, integrated, tags },
            variant.id
          ),
        });
      }
    }

    return requests;
  }

  /**
   * One component export request per configured variant.
   * Skipped entirely if no components field present in the config.
   */
  private buildComponentRequests(): ExportRequest[] {
    if (!this.projectConfig.components && !this.output.components) return [];

    const { folders, statuses, tags } = super.generateComponentPullFilter();

    return this.variants.map((variant) => ({
      kind: "components" as const,
      variantId: variant.id,
      params: this.exportParams({ folders, statuses, tags }, variant.id),
    }));
  }

  private exportParams(
    filters: Parameters<BaseFormatter<TOutputFile>["generateQueryParams"]>[0],
    variantId: string
  ): PullQueryParams {
    return {
      ...super.generateQueryParams(filters),
      // The export endpoints return the base variant when no variantId is given
      variantId: variantId === BASE_VARIANT_ID ? undefined : variantId,
      format: this.exportFormat,
      ...this.exportQueryParams(),
    };
  }
}
