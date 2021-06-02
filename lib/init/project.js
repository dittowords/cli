const fs = require('fs');

const ora = require('ora');
const { YAMLException } = require('js-yaml');
const { AutoComplete } = require('enquirer');

const api = require('../api').default;
const config = require('../config');
const consts = require('../consts');
const output = require('../output');
const { collectAndSaveToken } = require('../init/token');

function quit() {
  console.log('\nExiting Ditto CLI...');
  process.exitCode = 2;
  process.exit();
}

function saveProject(file, name, id) {
  const data = config.readData(file, { projects: [] });
  data.projects = [{ name, id }];
  config.writeData(file, data);
}

function needsProjects(configFile) {
  const file = configFile || consts.PROJECT_CONFIG_FILE;
  if (!fs.existsSync(file)) return { exists: false };
  let data;
  try {
    data = config.readData(file);
  } catch (e) {
    if (e instanceof YAMLException) {
      return { exists: false };
    }
  }

  const { projects } = data;

  if (!projects) 
    return { exists: false };

  if (projects.some(({ name, id }) => !(name && id)))  
    return { exists: false }

  return { exists: true, projects };
}

async function askForAnotherToken() {
  config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
  const message = "Looks like the API key you have saved no longer works. Please enter another one."
  await collectAndSaveToken(message);
}

async function getProjects(token) {
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
  return projects.data.map((item) => `${item.name} ${output.subtle(item.url)}`);
}

function parseResponse(response) {
  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);
  return { name, id };
}

async function collectProject(token, initialize) {
  const path = process.cwd();
  if (initialize) {
    const message = `Looks like there's no Ditto project associated with your current directory: ${output.info(path)}.`;
    console.log(message);
  }
  const projects = await getProjects(token);
  const prompt = new AutoComplete({
    name: 'project',
    message: initialize ? "Choose the project you'd like to sync text from" : 'Choose a different project',
    limit: 10,
    choices: projects,
  });

  const response = await prompt.run();
  return parseResponse(response);
}

async function collectAndSaveProject(initialize = false) {
  try {
    const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
    const project = await collectProject(token, initialize);
  
    console.log(`Thanks for choosing a project. We'll save this info to: ${output.info(consts.PROJECT_CONFIG_FILE)}`);
    output.nl();
  
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
