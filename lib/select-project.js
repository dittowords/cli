const { collectAndSaveProject } = require('./init/project');
const config = require('./config');
const output = require('./output');
const consts = require('./consts');

function quit() {
  console.log('Project selection was not updated.');
  process.exitCode = 2;
  process.exit();
}

const selectProject = async () => {
  const projectConfig = config.readData(consts.PROJECT_CONFIG_FILE);
  const { name, id } = projectConfig.projects[0];
  try {
    console.log("\nYou're currently set up to sync text from the following project: " + output.info(name) + " " + output.subtle('https://beta.dittowords.com/doc/' + id));
    await collectAndSaveProject(false);
  } catch (error) {
    if (error && error.response && error.response.status === 400) {
      console.log('\nSorry, there was an error fetching the projects in your workspace.');
    }
    quit();
  }
};

module.exports = selectProject;
