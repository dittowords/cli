const { AutoComplete } = require("enquirer");

const output = require("../output");

function formatProjectChoice(project) {
  return (
    project.name +
    " " +
    output.subtle(
      project.url || `https://app.dittowords.com/doc/${project.id}`
    )
  );
}

function parseResponse(response) {
  if (!response) {
    return null;
  }

  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);

  if (id === "all") {
    return { name, id: "ditto_component_library" };
  }

  return { name, id };
}

async function promptForProject({ message, projects, limit = 10 }) {
  output.nl();

  const choices = projects.map(formatProjectChoice);
  const prompt = new AutoComplete({
    name: "project",
    message,
    limit,
    choices,
  });

  let response;

  try {
    response = await prompt.run();
  } catch (e) {
    // this catch handles the case where someone presses
    // Ctrl + C to kill the AutoComplete process
    response = null;
  }

  return parseResponse(response);
}

module.exports = promptForProject;
