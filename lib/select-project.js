const { collectAndSaveProject } = require('./init/project');
const config = require('./config');
const consts = require('./consts');
const projectsToText = require('./utils/projectsToText');

function quit() {
  console.log('Project selection was not updated.');
  process.exitCode = 2;
  process.exit();
}

const selectProject = async () => {
  const { projects } = config.readData(consts.PROJECT_CONFIG_FILE);
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

module.exports = selectProject;
