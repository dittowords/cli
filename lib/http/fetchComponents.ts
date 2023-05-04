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

export async function fetchComponents(): Promise<FetchComponentResponse> {
  const api = createApiClient();
  const { data } = await api.get<{
    [compApiId: string]: {
      name: string;
      text: string;
      status: "NONE" | "WIP" | "REVIEW" | "FINAL";
      folder: "string" | null;
    };
  }>("/components", {});

  return data;
}
