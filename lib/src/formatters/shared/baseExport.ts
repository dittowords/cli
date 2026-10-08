import {
  PullFilters,
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

/**
 * A base and the configured projects connected to it, exported together into one file named
 * for the base. A base text item and its project instances may share a developer ID but can
 * hold different values, and the export endpoint only resolves those conflicts across items
 * it sees in the same request.
 */
type BaseTextItemSource = {
  kind: "base";
  /** Developer ID of the base */
  id: string;
  /** True if the base is in the config, so its own text items are exported too */
  fetchBaseTextItems: boolean;
  /** Developer IDs of the configured projects connected to this base */
  projectIds: string[];
};

/** A configured project that isn't connected to a base, exported into its own file. */
type ProjectTextItemSource = {
  kind: "project";
  /** Developer ID of the project */
  id: string;
};

/** Where the text items for one output file come from. `id` is the file's name prefix. */
export type TextItemSource = BaseTextItemSource | ProjectTextItemSource;

export type OutputFileSourceKind = TextItemSource["kind"] | "components";

interface ComponentsMap {
  [variantId: string]: ExportComponentsResponse;
}
interface TextItemsMap {
  [sourceId: string]: {
    [variantId: string]: ExportTextItemsResponse;
  };
}

export type ExportFormatAPIData = {
  textItemSources: TextItemSource[];
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
      sourceId: string;
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
    content: string | Record<string, unknown>,
    sourceKind: OutputFileSourceKind
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
    const textItemSources = await this.resolveTextItemSources();

    const requests: ExportRequest[] = [
      ...this.buildTextItemRequests(textItemSources),
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
        textItemsMap[request.sourceId] ??= {};
        textItemsMap[request.sourceId][request.variantId] = responses[index];
      } else {
        componentsMap[request.variantId] = responses[index];
      }
    });

    return { textItemSources, textItemsMap, componentsMap };
  }

  /**
   * For each source/variant permutation and its fetched file data,
   * create a new file named for the source (a base or a project) and variant
   *
   * @returns {OutputFile[]} List of Output Files
   */
  protected transformAPIData(data: ExportFormatAPIData): OutputFile[] {
    for (const source of data.textItemSources) {
      const sourceVariants = data.textItemsMap[source.id] ?? {};
      Object.entries(sourceVariants).forEach(
        ([variantId, textItemsFileContent]) => {
          const fileName = `${source.id}___${variantId || BASE_VARIANT_ID}`;
          this.createOutputFile(
            source.id,
            fileName,
            variantId,
            textItemsFileContent,
            source.kind
          );
        }
      );
    }

    Object.entries(data.componentsMap).forEach(
      ([variantId, componentsFileContent]) => {
        const filePrefix = "components";
        const fileName = `${filePrefix}___${variantId || BASE_VARIANT_ID}`;
        this.createOutputFile(
          filePrefix,
          fileName,
          variantId,
          componentsFileContent,
          "components"
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
   * Works out which files the configured projects and bases produce: one per base, holding
   * every configured project connected to it (plus the base's own text items, if the base is
   * configured), and one per configured project that isn't connected to a base.
   *
   * Returns no sources if neither a projects nor a bases field is present in the config.
   */
  private async resolveTextItemSources(): Promise<TextItemSource[]> {
    // projects and bases are taken together from the output if it sets either one,
    // otherwise from the top level -- never one from each.
    const { projects: configuredProjects, bases: configuredBases } =
      this.output.projects || this.output.bases
        ? this.output
        : this.projectConfig;

    // The projects list is the only place a project's baseId is exposed, so it's needed
    // whenever any projects are configured.
    const workspaceProjects = configuredProjects
      ? await fetchProjects(this.meta)
      : [];

    const baseIdByProjectId = new Map(
      workspaceProjects.map((project) => [project.id, project.baseId])
    );

    // projects: [] corresponds to exporting every project in the workspace
    const projectIds = (
      configuredProjects?.length === 0
        ? workspaceProjects
        : configuredProjects ?? []
    ).map((project) => project.id);

    const baseSources = new Map<string, BaseTextItemSource>();
    const getBaseSource = (baseId: string) => {
      if (!baseSources.has(baseId)) {
        baseSources.set(baseId, {
          kind: "base",
          id: baseId,
          fetchBaseTextItems: false,
          projectIds: [],
        });
      }
      return baseSources.get(baseId)!;
    };

    const projectSources: ProjectTextItemSource[] = [];

    for (const base of configuredBases ?? []) {
      getBaseSource(base.id).fetchBaseTextItems = true;
    }

    for (const projectId of projectIds) {
      const baseId = baseIdByProjectId.get(projectId);
      if (baseId) {
        getBaseSource(baseId).projectIds.push(projectId);
      } else {
        projectSources.push({ kind: "project", id: projectId });
      }
    }

    return [...baseSources.values(), ...projectSources];
  }

  /**
   * One text item export request per text item source and variant.
   */
  private buildTextItemRequests(sources: TextItemSource[]): ExportRequest[] {
    const { statuses, integrated, tags } = super.generateTextItemPullFilter();
    const requests: ExportRequest[] = [];

    for (const source of sources) {
      for (const variant of this.variants) {
        requests.push({
          kind: "textItems",
          sourceId: source.id,
          variantId: variant.id,
          params: this.exportParams(
            {
              ...this.textItemSourceFilter(source),
              statuses,
              integrated,
              tags,
            },
            variant.id
          ),
        });
      }
    }

    return requests;
  }

  private textItemSourceFilter(source: TextItemSource): PullFilters {
    // Individual, non-connected project
    if (source.kind === "project") {
      return { projects: [{ id: source.id }] };
    }

    // Base and/or project(s) connected to that base, grouped into a single file
    return {
      ...(source.projectIds.length > 0 && {
        projects: source.projectIds.map((id) => ({ id })),
      }),
      ...(source.fetchBaseTextItems && { bases: [{ id: source.id }] }),
    };
  }

  /**
   * One component export request per configured variant.
   * Skipped entirely if no components field present in the config.
   */
  private buildComponentRequests(): ExportRequest[] {
    if (!this.projectConfig.components && !this.output.components) return [];

    const { folders, statuses, integrated, tags } =
      super.generateComponentPullFilter();

    return this.variants.map((variant) => ({
      kind: "components" as const,
      variantId: variant.id,
      params: this.exportParams(
        { folders, statuses, integrated, tags },
        variant.id
      ),
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
