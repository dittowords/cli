import { CommandMetaFlags } from "../http/types";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import AndroidXMLFormatter from "./android";
import JSONICUFormatter from "./jsonICU";
import ARBFormatter from "./arb";
import IOSStringsFormatter from "./iosStrings";
import IOSStringsDictFormatter from "./iosStringsDict";
import JSONFormatter from "./json";
import logger from "../utils/logger";

export default function formatOutput(
  output: Output,
  projectConfig: ProjectConfigYAML,
  meta: CommandMetaFlags
) {
  const format = output.format;
  switch (format) {
    case "json":
      if (output.framework === "icu") {
        return new JSONICUFormatter(output, projectConfig, meta).format();
      }
      if (output.framework === "arb") {
        return new ARBFormatter(output, projectConfig, meta).format();
      }
      return new JSONFormatter(output, projectConfig, meta).format();
    case "android":
      return new AndroidXMLFormatter(output, projectConfig, meta).format();
    case "ios-strings":
      return new IOSStringsFormatter(output, projectConfig, meta).format();
    case "ios-stringsdict":
      return new IOSStringsDictFormatter(output, projectConfig, meta).format();
    case "json_icu":
      // Deprecated: prefer { format: "json", framework: "icu" } instead.
      logger.writeLine(
        logger.warnText(
          '[ditto pull] The "json_icu" format is deprecated and will be removed in a future release. Please use { format: "json", framework: "icu" } instead.'
        )
      );
      return new JSONICUFormatter(output, projectConfig, meta).format();
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}
