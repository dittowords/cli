import { createApiClient } from "../api";

interface FetchComponentFoldersResponse {
  [id: string]: string;
}

export async function fetchComponentFolders(): Promise<FetchComponentFoldersResponse> {
  const api = createApiClient();

  const { data } = await api.get<FetchComponentFoldersResponse>(
    "/v1/component-folders",
    {}
  );

  return data;
}
