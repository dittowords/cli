import path from "path";
import { writeFile } from "../pull";
import { SourceInformation } from "../types";
import { createApiClient } from "../api";
import consts from "../consts";
import output from "../output";
import { ProjectConfigYAML } from "../services/projectConfig";
import { Output } from "../outputs";

interface IArg {
  variants: boolean;
  components?:
    | boolean
    | {
        root?: boolean | { status?: string };
        folders?: string[] | { id: string | null; status?: string }[];
      };
  projects?: string[] | { id: string; status?: string }[];
  localeByVariantId?: Record<string, string>;
}

export async function generateSwiftDriver(
  projectConfig: ProjectConfigYAML,
  output: Output
): Promise<string> {
  const client = createApiClient();

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

  const { data } = await client.post<string>("/v1/ios/swift-driver", body);

  return data;
  // return `Successfully saved Swift driver to ${output.info("Ditto.swift")}`;
}

/*
// SOURCE
{
  hasSourceData: true,
  validProjects: [
    {
      id: '6931fcc647cb3c77fd176d64',
      name: 'DittoPay V2 QA File (BP Legacy Copy)',
      fileName: 'DittoPay V2 QA File (BP Legacy Copy)'
    }
  ],
  shouldFetchComponentLibrary: true,
  variants: true,
  format: [ 'ios-strings', 'ios-stringsdict' ],
  status: undefined,
  richText: undefined,
  hasTopLevelProjectsField: false,
  hasTopLevelComponentsField: false,
  hasComponentLibraryInProjects: false,
  componentRoot: undefined,
  componentFolders: [
    { id: 'ctas', name: 'CTAs' },
    { id: 'pregenerated-nonsense', name: 'Pregenerated Nonsense' },
  ],
  localeByVariantApiId: { base: 'en', spanish: 'es' },
  disableJsDriver: undefined
}

// BODY
{
  variants: true,
  localeByVariantId: { base: 'en', spanish: 'es' },
  components: {
    folders: [
      { id: 'ctas', name: 'CTAs' },
      { id: 'pregenerated-nonsense', name: 'Pregenerated Nonsense' }
    ]
  }
}

*/
