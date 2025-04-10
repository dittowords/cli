import httpClient from "./client";
import output from "../utils/output";
import { AxiosError } from "axios";
import appContext from "../utils/appContext";

export default async function checkToken(token: string) {
  try {
    const response = await httpClient.get("/token-check");
    if (response.status === 200) {
      return { success: true };
    }

    return {
      success: false,
      output: [
        output.errorText("This API key isn't valid. Please try another."),
      ],
    };
  } catch (e: unknown) {
    if (!(e instanceof AxiosError)) {
      return {
        success: false,
        output: [
          output.warnText(
            "Sorry! We're having trouble reaching the Ditto API. Please try again later."
          ),
        ],
      };
    }

    if (e.code === "ENOTFOUND") {
      return {
        success: false,
        output: [
          output.errorText(
            `Can't connect to API: ${output.url(appContext.apiHost)}`
          ),
        ],
      };
    }

    if (e.response?.status === 401 || e.response?.status === 404) {
      return {
        success: false,
        output: [
          output.errorText("This API key isn't valid. Please try another."),
        ],
      };
    }

    return {
      success: false,
      output: [
        output.errorText(
          "Sorry! We're having trouble reaching the Ditto API. Please try again later."
        ),
      ],
    };
  }
}
