import appContext from "../utils/appContext";
import formatOutput from "../formatters";

export const pull = async () => {
  for (const output of appContext.selectedProjectConfigOutputs) {
    await formatOutput(output, appContext.projectConfig);
  }
};
