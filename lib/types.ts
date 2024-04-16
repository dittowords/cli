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
  | "nested"
  | "structured"
  | "android"
  | "ios-strings"
  | "ios-stringsdict"
  | "icu";

export type SupportedExtension = ".json" | ".xml" | ".strings" | ".stringsdict";

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

  // TODO: might want to rename this at some point
  iosLocales?: Record<string, string>[];

  // prevents the generation of index.js and index.d.ts files
  // when working with JSON formats
  disableJsDriver?: boolean;

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
  localeByVariantApiId: Record<string, string> | undefined;
  disableJsDriver?: boolean;
}

export type Token = string | undefined;
