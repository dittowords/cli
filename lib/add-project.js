const { collectAndSaveProject } = require('./init/project');
const projectsToText = require('./utils/projectsToText');
const getSelectedProjects = require('./utils/getSelectedProjects');

function quit(exitCode = 2) {
  console.log('Project selection was not updated.');
  process.exitCode = exitCode;
  process.exit();
}

const addProject = async () => {
  const projects = getSelectedProjects();

  try {
    console.log(`\nYou're currently set up to sync text from the following projects: ${projectsToText(projects)}`);
    await collectAndSaveProject(false);
  } catch (error) {
    console.log(`\nSorry, there was an error adding a project to your workspace: `, error);
    quit();
  }
};

module.exports = addProject;
