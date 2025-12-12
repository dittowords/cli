import httpClient from "./client";
import { AxiosError } from "axios";
import {
  CommandMetaFlags,
  PullQueryParams,
  ZTextItemsResponse,
  ZExportTextItemsResponse,
} from "./types";
import getHttpClient from "./client";

function fetchTextWrapper<TResponse>(cb: () => Promise<TResponse>) {
  try {
    return cb();
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

export default async function fetchText<TResponse>(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  switch (params.format) {
    case "ios-strings":
      return fetchTextWrapper<TResponse>(async () => {
        const httpClient = getHttpClient({ meta });
        const response = await httpClient.get("/v2/textItems/export", {
          params,
        });
        return ZExportTextItemsResponse.parse(response.data) as TResponse;
      });
    default:
      return fetchTextWrapper<TResponse>(async () => {
        const httpClient = getHttpClient({ meta });
        const response = await httpClient.get("/v2/textItems", { params });
        return ZTextItemsResponse.parse(response.data) as TResponse;
      });
  }
}
