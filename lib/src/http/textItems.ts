import httpClient from "./client";
import { AxiosError } from "axios";
import { PullQueryParams, ZTextItemsResponse } from "./types";

export default async function fetchText(params: PullQueryParams) {
  try {
    const response = await httpClient.get("/v2/textItems", { params });

    return ZTextItemsResponse.parse(response.data);
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
