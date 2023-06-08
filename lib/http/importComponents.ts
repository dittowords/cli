import { createApiClient } from "../api";
import FormData from "form-data";

export interface ImportComponentResponse {
  componentsInserted: number;
  firstImportedId: string;
}

export interface CsvColumnMapping {
  text: number;
  name: number[];
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
  form.append("import", path);

  const requestOptions = {
    method: "POST",
    url: "/v1/components",
    ...(options.csvColumnMapping ? { params: options.csvColumnMapping } : {}),
    headers: {
      "content-type":
        "multipart/form-data; boundary=---011000010111000001101001",
    },
    data: "[form]",
  };

  const { data } = await api(requestOptions);

  return data;
}
