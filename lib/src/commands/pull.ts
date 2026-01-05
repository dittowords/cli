import appContext from "../utils/appContext";
import logger from "../utils/logger";
import getSwiftDriverFile from "../utils/getSwiftDriverFile";
import { writeFile } from "../utils/fileSystem";
import formatOutput from "../formatters";
import { CommandMetaFlags } from "../http/types";

const IOS_FORMATS = new Set(["ios-strings", "ios-stringsdict"]);

export const pull = async (meta: CommandMetaFlags) => {
  const hasIOSLocales = (appContext.projectConfig.iosLocales ?? []).length > 0;
  const hasIOSFormat = appContext.selectedProjectConfigOutputs.some((output) =>
    IOS_FORMATS.has(output.format)
  );
  const shouldGenerateIOSBundles = hasIOSFormat && hasIOSLocales;

  for (const output of appContext.selectedProjectConfigOutputs) {
    await formatOutput(output, appContext.projectConfig, meta);
  }

  if (shouldGenerateIOSBundles) {
    const swiftDriverFile = await getSwiftDriverFile(
      meta,
      appContext.projectConfig
    );
    await writeFile(swiftDriverFile.fullPath, swiftDriverFile.formattedContent);
    logger.writeLine(
      `Successfully saved to ${logger.info(swiftDriverFile.fullPath)}`
    );
  }
};
