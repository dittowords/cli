import getHttpClient from "./client";
import logger from "../utils/logger";
import { AxiosError } from "axios";
import appContext from "../utils/appContext";

const INVALID_API_KEY = "This API key isn't valid. Please try another.";

/**
 * @param token A credential to check. Omit to check whatever credential the app
 * context already holds — which is how an OAuth login gets verified, because its
 * access token needs the `Bearer` scheme the client adds.
 * @param invalidMessage What to say when the API rejects the credential.
 */
export default async function checkToken(
  token?: string,
  invalidMessage = INVALID_API_KEY
) {
  try {
    const httpClient = getHttpClient({ token });

    const response = await httpClient.get("/token-check");

    if (response.status === 200) {
      return { success: true };
    }

    return {
      success: false,
      output: [logger.errorText(invalidMessage)],
    };
  } catch (e: unknown) {
    if (!(e instanceof AxiosError)) {
      return {
        success: false,
        output: [
          logger.warnText(
            "Sorry! We're having trouble reaching the Ditto API. Please try again later."
          ),
        ],
      };
    }

    if (e.code === "ENOTFOUND") {
      return {
        success: false,
        output: [
          logger.errorText(
            `Can't connect to API: ${logger.url(appContext.apiHost)}`
          ),
        ],
      };
    }

    if (e.response?.status === 401 || e.response?.status === 404) {
      return {
        success: false,
        output: [logger.errorText(invalidMessage)],
      };
    }

    return {
      success: false,
      output: [
        logger.errorText(
          "Sorry! We're having trouble reaching the Ditto API. Please try again later."
        ),
      ],
    };
  }
}
