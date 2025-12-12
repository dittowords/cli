import { AxiosError } from "axios";
import {
  ZComponentsResponse,
  ZExportComponentsResponse,
  PullQueryParams,
  CommandMetaFlags,
} from "./types";
import getHttpClient from "./client";

function fetchComponentsWrapper<TResponse>(cb: () => Promise<TResponse>) {
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
      let errorMsgBase = "Invalid component filters";

      if (e.response?.data?.message) errorMsgBase = e.response.data.message;

      throw new Error(
        `${errorMsgBase}. Please check your component filters and try again.`,
        {
          cause: e.response?.data,
        }
      );
    }

    throw e;
  }
}

export default async function fetchComponents<TResponse>(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  switch (params.format) {
    case "ios-strings":
      return fetchComponentsWrapper<TResponse>(async () => {
        const httpClient = getHttpClient({ meta });
        const response = await httpClient.get("/v2/components/export", {
          params,
        });
        return ZExportComponentsResponse.parse(response.data) as TResponse;
      });
    default:
      return fetchComponentsWrapper<TResponse>(async () => {
        const httpClient = getHttpClient({ meta });
        const response = await httpClient.get("/v2/components", {
          params,
        });
        return ZComponentsResponse.parse(response.data) as TResponse;
      });
  }
}
