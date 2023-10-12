import path from "path";
import { writeFile } from "../pull";
import { SourceInformation } from "../types";
import { createApiClient } from "../api";
import consts from "../consts";
import output from "../output";

interface IArg {
  components?:
    | boolean
    | {
        root?: boolean | undefined;
        folders?: string[] | undefined;
      }
    | undefined;
  projects?: string[] | undefined;
}

export async function generateSwiftDriver(source: SourceInformation) {
  const client = createApiClient();

  const body: IArg = {};
  // TODO: need to add support for nuanced component config, including filtering by status
  if (source.shouldFetchComponentLibrary) body.components = true;
  if (source.validProjects)
    body.projects = source.validProjects.map(({ id }) => id);

  const { data } = await client.post<string>("/v1/export/swift-driver", body);

  const filePath = path.join(consts.TEXT_DIR, "Ditto.swift");

  await writeFile(filePath, data);

  return `Successfully saved Swift driver to ${output.info("Ditto.swift")}`;
}
