import { AxiosError } from "axios";
import {
  CommandMetaFlags,
  PullQueryParams,
  ZTextItemsResponse,
  ZExportTextItemsResponse,
} from "./types";
import getHttpClient from "./client";

export default async function fetchText<TResponse>(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    switch (params.format) {
      case "android":
      case "ios-strings":
      case "ios-stringsdict":
      case "icu":
        const exportResponse = await httpClient.get("/v2/textItems/export", {
          params,
        });
        return ZExportTextItemsResponse.parse(exportResponse.data) as TResponse;
      default:
        const defaultResponse = await httpClient.get("/v2/textItems", {
          params,
        });
        return ZTextItemsResponse.parse(defaultResponse.data) as TResponse;
    }
  } catch (e: unknown) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    // Handle invalid filters
    if (e.response?.status === 400) {
      let errorMsgBase = "Invalid project filters";

      if (e.response?.data?.message) errorMsgBase = e.response.data.message;

      throw new Error(
        `${errorMsgBase}. Please check your project filters and try again.`,
        {
          cause: e.response?.data,
        }
      );
    }

    throw e;
  }
}
