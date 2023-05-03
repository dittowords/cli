import { AxiosRequestConfig } from "axios";
import { createApiClient } from "../api";
import { PullOptions } from "../pull";
import { SourceInformation } from "../types";

export async function fetchVariants(
  source: SourceInformation,
  options: PullOptions = {}
) {
  const api = createApiClient();
  if (!source.variants) {
    return null;
  }

  const { shouldFetchComponentLibrary, validProjects } = source;

  const config: AxiosRequestConfig = {
    params: { ...options?.meta },
  };

  // if we're not syncing from the component library, then we pass the project ids
  // to limit the list of returned variants to only those that are relevant for the
  // specified projects
  if (validProjects.length && !shouldFetchComponentLibrary) {
    config.params.projectIds = validProjects.map(({ id }) => id);
  }

  const { data } = await api.get<{ apiID: string }[]>("/variants", config);

  return data;
}
