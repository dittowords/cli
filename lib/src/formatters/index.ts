import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import I18NextFormatter from "./i18next";

export default function handleOutput(
  output: Output,
  projectConfig: ProjectConfigYAML
) {
  switch (output.format) {
    case "i18next":
      return new I18NextFormatter(output, projectConfig).format(
        output,
        projectConfig
      );
    default:
      throw new Error(`Unsupported output format: ${output.format}`);
  }
}
