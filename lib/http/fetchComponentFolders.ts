import { createApiClient } from "../api";

interface FetchComponentFoldersResponse {
  [id: string]: string;
}

export async function fetchComponentFolders(
  options: {
    showSampleData?: boolean;
  } = {}
): Promise<FetchComponentFoldersResponse> {
  const api = createApiClient();

  let url = "/v1/component-folders";

  if (options.showSampleData === true) {
    url += "?showSampleData=true";
  }

  const { data } = await api.get<FetchComponentFoldersResponse>(url, {});

  return data;
}
