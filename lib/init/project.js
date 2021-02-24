const fs = require('fs');

const ora = require('ora');
const { YAMLException } = require('js-yaml');
const { AutoComplete } = require('enquirer');

const api = require('../api').default;
const config = require('../config');
const consts = require('../consts');
const output = require('../output');

function saveProject(file, name, id) {
  const data = config.readData(file, { projects: [] });
  data.projects = [{ name, id }];
  config.writeData(file, data);
}

function needsProject(configFile) {
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
  if (!data.projects) return { exists: false };
  if (!data.projects[0].name) return { exists: false };
  if (!data.projects[0].id) return { exists: false };
  return { exists: true, name: data.projects[0].name, id: data.projects[0].id };
}

async function getProjects(token = null) {
  const spinner = ora("Fetching projects in your workspace...");
  spinner.start();
  let projects = [];
  if (token) {
    projects = await api.get('/projects', {
      headers: {
        Authorization: `token ${token}`,
      },
    });
  } else {
    projects = await api.get('/projects');
  }
  spinner.stop();
  return projects.data.map((item) => `${item.name} ${output.subtle(item.url)}`);
}

function parseResponse(response) {
  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);
  return { name, id };
}

async function collectProject(token = null, initialize) {
  const path = process.cwd();
  if (initialize) {
    const message = `Looks like there's no Ditto project associated with your current directory: ${output.info(path)}.`;
    console.log(message);
  }
  const projects = await getProjects(token);

  const prompt = new AutoComplete({
    name: 'project',
    message: initialize ? "Choose the project you'd like to pull text from" : 'Choose a different project',
    limit: 10,
    choices: projects,
  });

  const response = await prompt.run();
  return parseResponse(response);
}

async function collectAndSaveProject(token = null, initialize = false) {
  const project = await collectProject(token, initialize);
  console.log(`Thanks for choosing a project.  We'll save this info to: ${output.info(consts.PROJECT_CONFIG_FILE)}`);
  output.nl();

  saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
}

module.exports = { needsProject, collectAndSaveProject };
