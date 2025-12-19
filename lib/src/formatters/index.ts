import { CommandMetaFlags } from "../http/types";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import AndroidXMLFormatter from "./android";
import JSONICUFormatter from "./jsonICU";
import IOSStringsFormatter from "./iosStrings";
import IOSStringsDictFormatter from "./iosStringsDict";
import JSONFormatter from "./json";

export default function formatOutput(
  output: Output,
  projectConfig: ProjectConfigYAML,
  meta: CommandMetaFlags
) {
  switch (output.format) {
    case "android":
      return new AndroidXMLFormatter(output, projectConfig, meta).format();
    case "json":
      return new JSONFormatter(output, projectConfig, meta).format();
    case "ios-strings":
      return new IOSStringsFormatter(output, projectConfig, meta).format();
    case "ios-stringsdict":
      return new IOSStringsDictFormatter(output, projectConfig, meta).format();
    case "json_icu":
      return new JSONICUFormatter(output, projectConfig, meta).format();
    default:
      throw new Error(`Unsupported output format: ${output}`);
  }
}
