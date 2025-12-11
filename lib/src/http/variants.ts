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

    // Handle invalid filters
    if (e.response?.status === 400) {
      let errorMsgBase = "Invalid variant filters";

      if (e.response?.data?.message) errorMsgBase = e.response.data.message;

      throw new Error(
        `${errorMsgBase}. Please check your variant filters and try again.`,
        {
          cause: e.response?.data,
        }
      );
    }

    throw e;
  }
}
