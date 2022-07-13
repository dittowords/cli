import output from "../output";
import projectsToText from "./projectsToText";
import { Project } from "../types";

const sourcesToText = (projects: Project[], componentLibrary: boolean) => {
  let message = "";

  if (componentLibrary) {
    message += `the ${output.info("Ditto Component Library")}`;

    if ((projects || []).length) {
      message += " and ";
    } else {
      message += "..";
    }
  }

  if ((projects || []).length) {
    message += `the following projects: ${projectsToText(projects)}\n`;
  }

  return message;
};

export default sourcesToText;
