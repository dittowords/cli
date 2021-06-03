const ora = require('ora');

const api = require('../api').default;
const config = require('../config');
const consts = require('../consts');
const output = require('../output');
const { collectAndSaveToken } = require('../init/token');
const getSelectedProjects = require('../utils/getSelectedProjects');
const promptForProject = require('../utils/promptForProject');

function quit() {
  console.log('\nExiting Ditto CLI...');
  process.exitCode = 2;
  process.exit();
}

function saveProject(file, name, id) {
  const projects = [
    ...getSelectedProjects(),
    { name, id }
  ];

  config.writeData(file, { projects });
}

function needsProjects(configFile) {
  const projects = getSelectedProjects(configFile);
  return !(projects && projects.length);
}

async function askForAnotherToken() {
  config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
  const message = "Looks like the API key you have saved no longer works. Please enter another one."
  await collectAndSaveToken(message);
}

async function getProjects(token, projectsAlreadySelected) {
  const spinner = ora("Fetching projects in your workspace...");
  spinner.start();

  let projects = [];

  try {
    projects = await api.get('/projects', {
      headers: {
        Authorization: `token ${token}`,
      },
    });
  } catch (e) {
    spinner.stop();
    throw e;
  }

  spinner.stop();

  return projects.data
    .filter(({ id }) => !projectsAlreadySelected.some(project => project.id === id));
}

async function collectProject(token, initialize) {
  const path = process.cwd();
  if (initialize) {
    console.log(`Looks like are no Ditto projects selected for your current directory: ${output.info(path)}.`);
  }

  const projectsAlreadySelected = getSelectedProjects();
  const projects = await getProjects(token, projectsAlreadySelected);

  if (!(
    projects && 
    projects.length
  )) {
    console.log("\nNo unselected projects were found in your workspace.");
    return null;
  }

  return promptForProject({ 
    projects,
    message: initialize ? "Choose the project you'd like to sync text from" : 'Add a project'
  });
}

async function collectAndSaveProject(initialize = false) {
  try {
    const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
    const project = await collectProject(token, initialize);
    if (!project) {
      quit();
      return;
    }
  
    console.log(
      '\n' +
      `Thanks for adding ${output.info(project.name)} to your selected projects.\n` + 
      `We saved your updated configuration to: ${output.info(consts.PROJECT_CONFIG_FILE)}\n`
    );
  
    saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
  } catch (e) {
    if (e.response && e.response.status === 404) {
      await askForAnotherToken();
      await collectAndSaveProject();
    } else {
      quit();
    }
  }
}

module.exports = { needsProjects, collectAndSaveProject };
