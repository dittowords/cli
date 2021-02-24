const { collectAndSaveProject } = require('./init/project');
const config = require('./config');
const output = require('./output');
const consts = require('./consts');

const selectProject = async () => {
  const projectConfig = config.readData(consts.PROJECT_CONFIG_FILE);
  const { name, id } = projectConfig.projects[0];
  try {
    console.log("\nYou're currently set up to sync text from the following project: " + output.info(name) + " " + output.subtle('https://beta.dittowords.com/doc/' + id));
    await collectAndSaveProject(null, false);
  } catch (error) {
    console.log('Project selection was not updated.');
    process.exitCode = 2;
    process.exit();
  }
};

module.exports = selectProject;
