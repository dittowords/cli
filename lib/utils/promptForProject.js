const { AutoComplete } = require('enquirer');

function parseResponse(response) {
  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);
  return { name, id };
}

async function promptForProject({ message, projects, limit = 10 }) {
  const prompt = new AutoComplete({
    name: 'project',
    message,
    limit,
    choices: projects,
  });

  const response = await prompt.run();

  return parseResponse(response);
}

module.exports = promptForProject;