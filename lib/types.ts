export interface Project {
  name: string;
  id: string;
  url?: string;
  fileName?: string;
  status?: string;
  exclude_components?: boolean;
}

export type Source = Project;

export interface ComponentFolder {
  id: string;
  name: string;
  status?: string;
}

export type SupportedFormat =
  | "flat"
  | "structured"
  | "android"
  | "ios-strings"
  | "ios-stringsdict"
  | "icu";

export interface ConfigYAML {
  sources?: {
    components?: {
      enabled?: boolean;
      root?: boolean | { status: string };
      folders?: ComponentFolder[];
    };
    projects?: Project[];
  };
  format?: SupportedFormat;
  status?: string;
  variants?: boolean;
  richText?: boolean;

  // these are legacy fields - if they exist, we should output
  // a deprecation error, and suggest that they nest them under
  // a top-level `sources` property
  components?: boolean;
  projects?: Project[];
}

export interface SourceInformation {
  hasSourceData: boolean;
  hasTopLevelProjectsField: boolean;
  hasTopLevelComponentsField: boolean;
  hasComponentLibraryInProjects: boolean;
  validProjects: Project[];
  shouldFetchComponentLibrary: boolean;
  variants: boolean;
  format: string | string[] | undefined;
  status: string | undefined;
  richText: boolean | undefined;
  componentRoot: boolean | { status: string } | undefined;
  componentFolders: ComponentFolder[] | null;
}

export type Token = string | undefined;
