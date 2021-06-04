const config = require('./config');
const consts = require('./consts');
const output = require('./output');
const getSelectedProjects = require("./utils/getSelectedProjects");
const promptForProject = require("./utils/promptForProject");

async function removeProject() {
  const projects = getSelectedProjects();
  if (!projects.length) {
    console.log(
      "\n" + 
      "No projects found in your workspace.\n" +
      `Try adding one with: ${output.info("ditto-cli project add")}\n`);
    return;
  }

  const projectToRemove = await promptForProject({ 
    projects,
    message: "Select a project to remove"
  });
  if (!projectToRemove) 
    return;
  

  config.writeData(
    consts.PROJECT_CONFIG_FILE,
    { projects: projects.filter(({ id }) => id !== projectToRemove.id)}
  );

  console.log(
    `\n${output.info(projectToRemove.name)} has been removed from your selected projects. ` + 
    `\nWe saved your updated configuration to: ${output.info(consts.PROJECT_CONFIG_FILE)}` +
    "\n"
  );
}

module.exports = removeProject;