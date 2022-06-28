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
