import appContext from "../utils/appContext";
import formatOutput from "../formatters";
import { CommandMetaFlags } from "../http/types";

export const pull = async (meta: CommandMetaFlags) => {
  for (const output of appContext.selectedProjectConfigOutputs) {
    await formatOutput(output, appContext.projectConfig, meta);
  }
};
