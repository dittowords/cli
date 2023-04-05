import api from "../api";

export async function fetchComponents() {
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
