import { createApiClient } from "../api";

export interface FetchComponentResponseComponent {
  name: string;
  text: string;
  status: "NONE" | "WIP" | "REVIEW" | "FINAL";
  folder: "string" | null;
}

export interface FetchComponentResponse {
  [compApiId: string]: FetchComponentResponseComponent;
}

export async function fetchComponents(options: {
  componentFolder?: string;
}): Promise<FetchComponentResponse> {
  const api = createApiClient();

  if (options.componentFolder) {
    try {
      const { data } = await api.get<FetchComponentResponse>(
        `/v1/component-folders/${options.componentFolder}/components`,
        {}
      );

      return data;
    } catch (e) {
      console.log(
        `Failed to get components for ${options.componentFolder}. Please verify the folder's API ID.`
      );
      return {};
    }
  } else {
    const { data } = await api.get<FetchComponentResponse>(
      "/v1/components",
      {}
    );

    return data;
  }
}
