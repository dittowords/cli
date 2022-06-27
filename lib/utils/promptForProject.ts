const { AutoComplete } = require("enquirer");

import * as output from "../output";

interface Project {
  id: string;
  name: string;
  url?: string;
}

function formatProjectChoice(project: Project) {
  return (
    project.name +
    " " +
    output.subtle(project.url || `https://app.dittowords.com/doc/${project.id}`)
  );
}

function parseResponse(response: string) {
  if (!response) {
    return null;
  }

  const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);

  if (id === "all") {
    return { name, id: "ditto_component_library" };
  }

  return { name, id };
}

interface ProjectPromptParams {
  message: string;
  projects: Project[];
  limit?: number;
}

const promptForProject = async ({
  message,
  projects,
  limit = 10,
}: ProjectPromptParams) => {
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
};

export default promptForProject;
