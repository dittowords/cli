import BaseExportFormatter from "./shared/baseExport";
import IOSStringsOutputFile from "./shared/fileTypes/IOSStringsOutputFile";
import {
  ExportComponentsStringResponse,
  ExportTextItemsStringResponse,
  PullFilters,
  PullQueryParams,
  SwiftFileGenerationFilters,
} from "../http/types";
import OutputFile from "./shared/fileTypes/OutputFile";
import generateSwiftDriver from "../http/cli";

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
    let path = this.outDir;
    if (this.projectConfig.iosLocales) {
      const locale = this.projectConfig.iosLocales.find(
        (localePair) => localePair[variantId]
      );
      if (locale) {
        path = path.concat(`/${locale[variantId]}.lproj`);
      }
    }
    this.outputFiles[fileName] ??= new IOSStringsOutputFile({
      filename: fileName,
      path: path,
      metadata: { variantId: variantId || "base" },
      content: content,
    });
  }

  private getGenerateSwiftDriverParams(): SwiftFileGenerationFilters {
    const locales =
      this.output.iosLocales ?? this.projectConfig.iosLocales ?? [];
    const localeMap = locales.reduce(
      (acc, locale) => ({ ...acc, ...locale }),
      {}
    );

    const folders =
      this.output.components?.folders ?? this.projectConfig.components?.folders;

    let filters = {
      localeByVariantId: localeMap,
      ...(folders && { components: { folders } }),
      projects: this.output.projects || this.projectConfig.projects || [],
    };

    return filters;
  }

  protected async writeFiles(files: OutputFile[]): Promise<void> {
    console.dir(this.getGenerateSwiftDriverParams(), { depth: null });
    const swiftDriver = await generateSwiftDriver(
      this.projectConfig,
      this.meta
    );
    console.log("swiftDriver", swiftDriver);
    await super.writeFiles(files);
  }
}

/*

const body: IArg = {
    variants: source.variants,
    localeByVariantId: source.localeByVariantApiId,
  };

  if (source.componentFolders || source.componentRoot) {
    body.components = {};
    if (source.componentFolders) {
      body.components.folders = source.componentFolders;
    }
    if (source.componentRoot) {
      body.components.root = source.componentRoot;
    }
  } else if (source.shouldFetchComponentLibrary) {
    body.components = true;
  }

  if (source.validProjects) body.projects = source.validProjects;



>>>>>>>>>>>>>
{
  variants: true,
  localeByVariantId: { base: 'en', spanish: 'es' },
  components: {
    folders: [
      { id: 'ctas', name: 'CTAs' },
      { id: 'pregenerated-nonsense', name: 'Pregenerated Nonsense' }
    ],
    root: true
  },
  projects: [
    {
      id: '6931fcc647cb3c77fd176d64',
      name: 'DittoPay V2 QA File (BP Legacy Copy)',
      fileName: 'DittoPay V2 QA File (BP Legacy Copy)'
    }
  ]
}
*/
