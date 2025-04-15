const { AutoComplete } = require("enquirer");

import output from "../output";
import { Project } from "../types";
import { getSourceUrl } from "./projectsToText";

function formatProjectChoice(project: Project) {
  return (
    project.name + " " + output.subtle(project.url || getSourceUrl(project.id))
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
  output.write("\n");

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
