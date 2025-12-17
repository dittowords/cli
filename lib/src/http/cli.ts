import { AxiosError } from "axios";
import { ZProjectsResponse, CommandMetaFlags } from "./types";
import getHttpClient from "./client";
import { ProjectConfigYAML } from "../services/projectConfig";

export default async function generateSwiftDriver(
  projectConfig: ProjectConfigYAML,
  meta: CommandMetaFlags
) {
  try {
    const httpClient = getHttpClient({ meta });
    const response = await httpClient.post(
      "/v2/cli/swiftDriver",
      projectConfig
    );

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
