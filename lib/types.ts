export interface Project {
  name: string;
  id: string;
  url?: string;
  fileName?: string;
}

export interface ConfigYAML {
  components?: boolean;
  projects?: Project[];
  format?: string;
  variants?: boolean;
}

export interface SourceInformation {
  hasSourceData: boolean;
  validProjects: Project[];
  shouldFetchComponentLibrary: boolean;
  variants: boolean;
  format: string | undefined;
}

export type Token = string | undefined;
