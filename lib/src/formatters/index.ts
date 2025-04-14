import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import JSONFormatter from "./json";

export default function handleOutput(
  output: Output,
  projectConfig: ProjectConfigYAML
) {
  switch (output.format) {
    case "json":
      return new JSONFormatter(output, projectConfig).format(
        output,
        projectConfig
      );
    default:
      throw new Error(`Unsupported output format: ${output}`);
  }
}
