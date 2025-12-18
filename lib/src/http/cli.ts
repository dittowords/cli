import { AxiosError } from "axios";
import { CommandMetaFlags, IExportSwiftFileRequest } from "./types";
import getHttpClient from "./client";

export default async function generateSwiftDriver(
  params: IExportSwiftFileRequest,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const response = await httpClient.post("/v2/cli/swiftDriver", params);

    return response.data;
  } catch (e) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    throw e;
  }
}
