import { collectAndSaveProject } from "./init/project";
import projectsToText from "./utils/projectsToText";
import {
  getSelectedProjects,
  getIsUsingComponents,
} from "./utils/getSelectedProjects";
import output from "./output";

function quit(exitCode = 2) {
  console.log("Project selection was not updated.");
  process.exitCode = exitCode;
  process.exit();
}

const addProject = async () => {
  const projects = getSelectedProjects();
  const usingComponents = getIsUsingComponents();

  try {
    if (usingComponents) {
      if (projects.length) {
        console.log(
          `\nYou're currently syncing text from the ${output.info(
            "Component Library"
          )} and from the following projects: ${projectsToText(projects)}`
        );
      } else {
        console.log(
          `\nYou're currently only syncing text from the ${output.info(
            "Component Library"
          )}`
        );
      }
    } else if (projects.length) {
      console.log(
        `\nYou're currently set up to sync text from the following projects: ${projectsToText(
          projects
        )}`
      );
    }
    await collectAndSaveProject(false);
  } catch (error) {
    console.log(
      `\nSorry, there was an error adding a project to your workspace: `,
      error
    );
    quit();
  }
};

export default addProject;
