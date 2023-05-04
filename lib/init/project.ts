import ora from "ora";

import { createApiClient } from "../api";
import config from "../config";
import consts from "../consts";
import output from "../output";
import { collectAndSaveToken } from "./token";
import {
  getSelectedProjects,
  getIsUsingComponents,
} from "../utils/getSelectedProjects";
import promptForProject from "../utils/promptForProject";
import { AxiosResponse } from "axios";
import { Project, Token } from "../types";
import { quit } from "../utils/quit";

function saveProject(file: string, name: string, id: string) {
  if (id === "components") {
    config.writeProjectConfigData(file, {
      sources: { components: { enabled: true } },
    });
    return;
  }

  const projects = [...getSelectedProjects(file), { name, id }];
  config.writeProjectConfigData(file, { sources: { projects } });
}

export const needsSource = () => {
  return !config.parseSourceInformation().hasSourceData;
};

async function askForAnotherToken() {
  config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
  const message =
    "Looks like the API key you have saved no longer works. Please enter another one.";
  await collectAndSaveToken(message);
}

async function listProjects(token: Token, projectsAlreadySelected: Project[]) {
  const api = createApiClient();
  const spinner = ora("Fetching sources in your workspace...");
  spinner.start();

  let response: AxiosResponse<{ id: string; name: string }[]>;
  try {
    response = await api.get("/project-names");
  } catch (e) {
    spinner.stop();
    throw e;
  }

  const projectsAlreadySelectedSet = projectsAlreadySelected.reduce(
    (set, project) => set.add(project.id.toString()),
    new Set<string>()
  );

  const result = response.data.filter(
    ({ id }) =>
      // covers an edge case where v0 of the API includes the component library
      // in the response from the `/project-names` endpoint
      id !== "ditto_component_library" &&
      !projectsAlreadySelectedSet.has(id.toString())
  );

  spinner.stop();

  return result;
}

async function collectSource(token: Token, includeComponents: boolean) {
  const projectsAlreadySelected = getSelectedProjects();
  const componentSourceSelected = getIsUsingComponents();

  let sources = await listProjects(token, projectsAlreadySelected);
  if (includeComponents && !componentSourceSelected) {
    sources = [
      { id: "ditto_component_library", name: "Ditto Component Library" },
      ...sources,
    ];
  }

  if (!sources?.length) {
    console.log("You're currently syncing all projects in your workspace.");
    console.log(
      output.warnText(
        "Not seeing a project that you were expecting? Verify that developer mode is enabled on that project. More info: https://www.dittowords.com/docs/ditto-developer-mode"
      )
    );
    return null;
  }

  return promptForProject({
    projects: sources,
    message: "Choose the source you'd like to sync text from",
  });
}

export const collectAndSaveSource = async (
  { components = false }: { initialize?: boolean; components?: boolean } = {
    components: false,
  }
) => {
  try {
    const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
    const project = await collectSource(token, components);
    if (!project) {
      quit("", 0);
      return;
    }

    console.log(
      "\n" +
        `Thanks for adding ${output.info(
          project.name
        )} to your selected sources.\n` +
        `We saved your updated configuration to: ${output.info(
          consts.PROJECT_CONFIG_FILE
        )}\n`
    );

    saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
  } catch (e: any) {
    console.log(e);
    if (e.response && e.response.status === 404) {
      await askForAnotherToken();
      await collectAndSaveSource({ components });
    } else {
      quit("", 2);
    }
  }
};

export const _testing = { saveProject, needsSource };

export default { needsSource, collectAndSaveSource };
