import { AxiosError } from "axios";
import { ZProjectsResponse, CommandMetaFlags } from "./types";
import getHttpClient from "./client";

export default async function fetchProjects(meta: CommandMetaFlags) {
  try {
    const httpClient = getHttpClient({ meta });
    const response = await httpClient.get("/v2/projects");

    return ZProjectsResponse.parse(response.data);
  } catch (e) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    throw e;
  }
}
