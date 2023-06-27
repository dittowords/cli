export interface Project {
  name: string;
  id: string;
  url?: string;
  fileName?: string;
}

export type Source = Project;

interface ComponentFolder {
  id: string;
  name: string;
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
  validProjects: Project[];
  shouldFetchComponentLibrary: boolean;
  variants: boolean;
  format: string | string[] | undefined;
  status: string | undefined;
  richText: boolean | undefined;
  componentFolders: ComponentFolder[] | null;
}

export type Token = string | undefined;
