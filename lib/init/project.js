const fs = require('fs');

const faker = require('faker');
const ora = require('ora');
const { YAMLException } = require('js-yaml');
const { AutoComplete } = require('enquirer');

const api = require('../api').default;
const config = require('../config');
const consts = require('../consts');
const output = require('../output');

function saveProject(file, name, id) {
  const data = config.readData(file, { projects: [] });
  data.projects.push({ name, id });
  config.writeData(file, data);
}

function needsProject(configFile) {
  const file = configFile || consts.PROJECT_CONFIG_FILE;
  if (!fs.existsSync(file)) return true;
  let data;
  try {
    data = config.readData(file);
  } catch (e) {
    if (e instanceof YAMLException) {
      return true;
    }
  }
  if (!data.projects) return true;
  if (!data.projects[0].name) return true;
  if (!data.projects[0].id) return true;
  return false;
}

async function getProjects(demo = false) {
  const spinner = ora("Let's fix that.");
  spinner.start();
  let projects = {};
  if (demo) {
    projects.data = [{}, {}, {}, {}, {}, {}, {}, {}];
    projects.data.forEach((item) => {
      const fakeItem = item;
      fakeItem.name = faker.commerce.productName();
      const fakeProjectId = faker.git.commitSha().slice(0, 12);
      fakeItem.url = `https://beta.dittowords.com/doc/${fakeProjectId}`;
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

async function collectProject(demo) {
  const path = process.cwd();
  const message = `There's no Ditto project associated with ${output.info(path)}.`;

  output.write(message);
  output.nl();
  const projects = await getProjects(demo);
  output.nl();

  const prompt = new AutoComplete({
    name: 'project',
    message: 'Choose your project',
    limit: 10,
    choices: projects,
  });

  const response = await prompt.run();
  return parseResponse(response);
}

async function collectAndSaveProject(demo) {
  const project = await collectProject(demo);

  console.log('\n');
  output.write("Thanks, for choosing a project.  We'll save it to:");
  console.log('\n');
  console.log(output.info(consts.PROJECT_CONFIG_FILE));

  if (!demo) saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
}

module.exports = { needsProject, collectAndSaveProject };
