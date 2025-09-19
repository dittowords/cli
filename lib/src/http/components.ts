import { AxiosError } from "axios";
import { ZComponentsResponse, PullQueryParams } from "./types";
import httpClient from "./client";

export default async function fetchComponents(params: PullQueryParams) {
  try {
    const response = await httpClient.get("/v2/components", { params });

    return ZComponentsResponse.parse(response.data);
  } catch (e) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    // Handle invalid filters
    if (e.response?.status === 400) {
      throw new Error(
        "Invalid filters. Please check your filters and try again."
      );
    }

    throw e;
  }
}