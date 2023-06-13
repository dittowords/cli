import { createApiClient } from "../api";

interface FetchComponentFoldersResponse {
  [id: string]: string;
}

export async function fetchComponentFolders(): Promise<FetchComponentFoldersResponse> {
  const api = createApiClient();

  const { data } = await api.get<FetchComponentFoldersResponse>(
    "/component-folders",
    {}
  );

  return data;
}
