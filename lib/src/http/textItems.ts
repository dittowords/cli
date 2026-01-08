import { AxiosError } from "axios";
import {
  CommandMetaFlags,
  PullQueryParams,
  ZTextItemsResponse,
  ZExportTextItemsResponse,
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

export async function fetchTextItems(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const defaultResponse = await httpClient.get("/v2/textItems", {
      params,
    });
    return ZTextItemsResponse.parse(defaultResponse.data);
  } catch (e: unknown) {
    throw handleError(
      e,
      "Invalid project filters",
      "Please check your project filters and try again."
    );
  }
}

export async function exportTextItems(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const exportResponse = await httpClient.get("/v2/textItems/export", {
      params,
    });
    return ZExportTextItemsResponse.parse(exportResponse.data);
  } catch (e: unknown) {
    throw handleError(
      e,
      "Invalid params",
      "Please check your request parameters and try again."
    );
  }
}
