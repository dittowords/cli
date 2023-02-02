export interface Project {
  name: string;
  id: string;
  url?: string;
  fileName?: string;
}

export interface ConfigYAML {
  sources?: {
    components?: boolean;
    projects?: Project[];
  };
  format?: string;
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
  format: string | undefined;
  status: string | undefined;
  richText: boolean | undefined;
}

export type Token = string | undefined;
