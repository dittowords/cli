import { AxiosError } from "axios";
import {
  ZComponentsResponse,
  PullQueryParams,
  CommandMetaFlags,
} from "./types";
import getHttpClient from "./client";

export default async function fetchComponents(
  params: PullQueryParams,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const response = await httpClient.get("/v2/components", {
      params,
    });

    return ZComponentsResponse.parse(response.data);
  } catch (e) {
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
