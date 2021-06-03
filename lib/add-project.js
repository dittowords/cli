const { collectAndSaveProject } = require('./init/project');
const projectsToText = require('./utils/projectsToText');
const getSelectedProjects = require('./utils/getSelectedProjects');

function quit() {
  console.log('Project selection was not updated.');
  process.exitCode = 2;
  process.exit();
}

const addProject = async () => {
  const projects = getSelectedProjects();

  try {
    console.log(`\nYou're currently set up to sync text from the following projects: ${projectsToText(projects)}`);
    await collectAndSaveProject(false);
  } catch (error) {
    if (error && error.response && error.response.status === 400) {
      console.log('\nSorry, there was an error fetching the projects in your workspace.');
    }
    quit();
  }
};

module.exports = addProject;
