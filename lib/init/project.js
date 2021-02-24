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
  if (!data.projects) {
    data.projects = [];
  }
  data.projects.push({ name, id });
  config.writeData(file, data);
}

function needsProject(configFile) {
  const file = configFile || consts.PROJECT_CONFIG_FILE;
  if (!fs.existsSync(file)) return { empty: true };
  let data;
  try {
    data = config.readData(file);
  } catch (e) {
    if (e instanceof YAMLException) {
      return { empty: true };
    }
  }
  if (!data.projects) return { empty: true };
  if (!data.projects[0].name) return { empty: true };
  if (!data.projects[0].id) return { empty: true };
  return { empty: false, name: data.projects[0].name, id: data.projects[0].id };
}

async function getProjects() {
  const spinner = ora("Fetching projects in your workspace...");
  spinner.start();
  const projects = await api.get('/projects');
  spinner.stop();
  return projects.data.map((item) => `${item.name} ${output.subtle(item.url)}`);
}

function parseResponse(response) {
  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);
  return { name, id };
}

async function collectProject() {
  const path = process.cwd();
  const message = `Looks like there's no Ditto project associated with your current directory: ${output.info(path)}.`;

  console.log(message);
  const projects = await getProjects();
  output.nl();

  const prompt = new AutoComplete({
    name: 'project',
    message: "Choose the project you'd like to pull text from",
    limit: 10,
    choices: projects,
  });

  const response = await prompt.run();
  return parseResponse(response);
}

async function collectAndSaveProject() {
  const project = await collectProject();
  output.nl();
  console.log(`Thanks for choosing a project.  We'll save this info to: ${output.info(consts.PROJECT_CONFIG_FILE)}`);
  output.nl();

  saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
}

module.exports = { needsProject, collectAndSaveProject };
