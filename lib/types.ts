export interface Project {
  name: string;
  id: string;
  url?: string;
  fileName?: string;
  status?: string;
  exclude_components?: boolean;
}

export type ComponentSource = ComponentFolder & {
  type: "components";
  fileName: string;
  variant: string;
};

export type Source = (Project & { type?: undefined }) | ComponentSource;

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

type ComponentsSourceBool = boolean;
type ComponentsSourceConfig = {
  root?: boolean | { status: string };
  folders?: ComponentFolder[];
};
type ComponentsSource = ComponentsSourceBool | ComponentsSourceConfig;

export interface ConfigYAML {
  sources?: {
    components?: ComponentsSource;
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
  componentFolders: ComponentFolder[] | undefined;
}

export type Token = string | undefined;
