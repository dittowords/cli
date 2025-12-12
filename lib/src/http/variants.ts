import { AxiosError } from "axios";
import { ZVariantsResponse, CommandMetaFlags } from "./types";
import getHttpClient from "./client";

// BP: Add wrapper function to this and other HTTP requests
export default async function fetchVariants(meta: CommandMetaFlags) {
  try {
    const httpClient = getHttpClient({ meta });
    const response = await httpClient.get("/v2/variants");

    return ZVariantsResponse.parse(response.data);
  } catch (e) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    throw e;
  }
}
