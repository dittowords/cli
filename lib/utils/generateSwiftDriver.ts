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
        root?: boolean | { status?: string } | undefined;
        folders?:
          | string[]
          | { id: string | null; status?: string }[]
          | undefined;
      }
    | undefined;
  projects?: string[] | { id: string; status?: string }[] | undefined;
}

export async function generateSwiftDriver(source: SourceInformation) {
  const client = createApiClient();

  const body: IArg = {};

  if (source.componentFolders || source.componentRoot) {
    body.components = {};
    if (source.componentFolders) {
      body.components.folders = source.componentFolders;
    }
    if (source.componentRoot) {
      body.components.root = source.componentRoot;
    }
  } else if (source.shouldFetchComponentLibrary) {
    body.components = true;
  }

  if (source.validProjects) body.projects = source.validProjects;

  const { data } = await client.post<string>("/v1/export/swift-driver", body);
  const filePath = path.join(consts.TEXT_DIR, "Ditto.swift");
  await writeFile(filePath, data);

  return `Successfully saved Swift driver to ${output.info("Ditto.swift")}`;
}
