import config from "./config";
import consts from "./consts";
import output from "./output";
import {
  getSelectedProjects,
  getIsUsingComponents,
} from "./utils/getSelectedProjects";
import promptForProject from "./utils/promptForProject";

async function removeProject() {
  const projects = getSelectedProjects();
  const isUsingComponents = getIsUsingComponents();
  if (!projects.length && !isUsingComponents) {
    console.log(
      "\n" +
        "No projects found in your current configuration.\n" +
        `Try adding one with: ${output.info("ditto-cli project add")}\n`
    );
    return;
  }

  const projectToRemove = await promptForProject({
    projects,
    message: "Select a project to remove",
  });
  if (!projectToRemove) return;

  config.writeProjectConfigData(consts.PROJECT_CONFIG_FILE, {
    components: isUsingComponents && projectToRemove.id !== "components",
    projects: projects.filter(({ id }) => id !== projectToRemove.id),
  });

  console.log(
    `\n${output.info(
      projectToRemove.name
    )} has been removed from your selected projects. ` +
      `\nWe saved your updated configuration to: ${output.info(
        consts.PROJECT_CONFIG_FILE
      )}` +
      "\n"
  );
}

export default removeProject;
