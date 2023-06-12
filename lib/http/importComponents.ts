import { createApiClient } from "../api";
import FormData from "form-data";
import fs from "fs";

export interface ImportComponentResponse {
  componentsInserted: number;
  firstImportedId: string;
}

export interface CsvColumnMapping {
  text: number;
  name: string;
  notes?: number;
  tags?: number;
  status?: number;
  componentId?: number;
}

export async function importComponents(
  path: string,
  options: {
    csvColumnMapping?: CsvColumnMapping;
  }
): Promise<ImportComponentResponse> {
  const api = createApiClient();

  const form = new FormData();
  form.append("import", fs.createReadStream(path));

  const requestOptions = {
    method: "POST",
    url: "/v1/components/file",
    params: {
      ...(options.csvColumnMapping?.name
        ? { name: `[${options.csvColumnMapping.name}]` }
        : {}),
      ...(options.csvColumnMapping?.text
        ? { text: options.csvColumnMapping.text }
        : {}),
    },
    headers: {
      "content-type": "multipart/form-data",
    },
    data: form,
  };

  try {
    const { data } = await api(requestOptions);

    return data;
  } catch (e: any) {
    console.error("Failed to import file.");
    console.error(e.response?.data?.message || e.message);
    return {
      componentsInserted: 0,
      firstImportedId: "null",
    };
  }
}
