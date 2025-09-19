import { AxiosError } from "axios";
import { ZComponentsResponse, PullQueryParams } from "./types";
import { z } from "zod";
import httpClient from "./client";

export default async function getComponents(params: PullQueryParams) {
  try {
    console.log("what are the params when we get to here", params);
    const response = await httpClient.get("/v2/components", { params });

    console.log("components response", response);

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