import { CommandMetaFlags } from "../http/types";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import JSONFormatter from "./json";

export default function formatOutput(
  output: Output,
  projectConfig: ProjectConfigYAML,
  meta: CommandMetaFlags
) {
  switch (output.format) {
    case "json":
      return new JSONFormatter(output, projectConfig, meta).format();
    default:
      throw new Error(`Unsupported output format: ${output}`);
  }
}
