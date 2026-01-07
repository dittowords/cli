import SwiftOutputFile from "../formatters/shared/fileTypes/SwiftOutputFile";
import generateSwiftDriver from "../http/cli";
import { CommandMetaFlags } from "../http/types";
import { ProjectConfigYAML } from "../services/projectConfig";
import appContext from "./appContext";

export default async function getSwiftDriverFile(
  meta: CommandMetaFlags,
  projectConfig: ProjectConfigYAML
): Promise<SwiftOutputFile> {
  const folders = projectConfig.components?.folders;

  const filters = {
    ...(folders && { components: { folders } }),
    projects: projectConfig.projects || [],
  };

  const swiftDriver = await generateSwiftDriver(filters, meta);
  return new SwiftOutputFile({
    path: appContext.outDir,
    content: swiftDriver,
  });
}
