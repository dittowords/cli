import appContext from "../utils/appContext";
import formatOutput from "../formatters";

export const pull = async (meta: Record<string, string>) => {
  for (const output of appContext.selectedProjectConfigOutputs) {
    await formatOutput(output, appContext.projectConfig, meta);
  }
};
