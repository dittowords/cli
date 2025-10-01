import output from "../output";
import { Project } from "../types";

export const getSourceUrl = (sourceId: string) => {
  let base = "https://app.dittowords.com";

  if (sourceId === "ditto_component_library") {
    return `${base}/components`;
  }

  return `${base}/doc/${sourceId}`;
};

const projectsToText = (projects: Project[]) => {
  return (
    (projects || []).reduce(
      (outputString, { name, id }) =>
        outputString +
        ("\n" +
          "- " +
          output.info(name) +
          " " +
          output.subtle(getSourceUrl(id))),
      ""
    ) + "\n"
  );
};

export default projectsToText;
