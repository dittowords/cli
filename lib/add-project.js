const { collectAndSaveProject } = require("./init/project");
const projectsToText = require("./utils/projectsToText");
const {
  getSelectedProjects,
  getIsUsingComponents,
} = require("./utils/getSelectedProjects");
const output = require("./output");

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
          `\nYou're currently set up to sync text from the ${output.info(
            "Component Library"
          )} and from the following projects: ${projectsToText(projects)}`
        );
      } else {
        console.log(
          `\nYou're currently only set up to sync text from the ${output.info(
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

module.exports = addProject;
