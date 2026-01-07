import { AxiosError } from "axios";
import {
  ZComponentsResponse,
  PullQueryParams,
  CommandMetaFlags,
  ZExportComponentsResponse,
} from "./types";
import getHttpClient from "./client";

const handleError = (
  e: unknown,
  msgBase: string,
  msgDescription: string
): Error => {
  if (!(e instanceof AxiosError)) {
    return new Error(
      "Sorry! We're having trouble reaching the Ditto API. Please try again later."
    );
  }

  // Handle invalid filters
  if (e.response?.status === 400) {
    let errorMsgBase = msgBase;

    if (e.response?.data?.message) errorMsgBase = e.response.data.message;

    return new Error(`${errorMsgBase}. ${msgDescription}`, {
      cause: e.response?.data,
    });
  }

  return e;
};

export async function fetchComponents(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const defaultResponse = await httpClient.get("/v2/components", {
      params,
    });
    return ZComponentsResponse.parse(defaultResponse.data);
  } catch (e: unknown) {
    throw handleError(
      e,
      "Invalid component filters",
      "Please check your component filters and try again."
    );
  }
}

export async function exportComponents(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const exportResponse = await httpClient.get("/v2/components/export", {
      params,
    });
    return ZExportComponentsResponse.parse(exportResponse.data);
  } catch (e: unknown) {
    throw handleError(
      e,
      "Invalid params",
      "Please check your params and try again."
    );
  }
}
