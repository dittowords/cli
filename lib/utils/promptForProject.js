const { AutoComplete } = require('enquirer');

const output = require('../output');

function formatProjectChoice(project) {
  return project.name + " " + output.subtle(
    project.url || `https://beta.dittowords.com/doc/${project.id}`
  ) 
}

function parseResponse(response) {
  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);

  if (id === 'all') {
    return { name, id: 'ditto_component_library'}
  }

  return { name, id };
}

async function promptForProject({ message, projects, limit = 10 }) {
  output.nl();

  const choices = projects.map(formatProjectChoice);
  const prompt = new AutoComplete({
    name: 'project',
    message,
    limit,
    choices,
  });

  const response = await prompt.run();

  return parseResponse(response);
}

module.exports = promptForProject;