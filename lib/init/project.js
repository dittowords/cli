const ora = require("ora");

const api = require("../api").default;
const config = require("../config");
const consts = require("../consts");
const output = require("../output");
const { collectAndSaveToken } = require("../init/token");
const {
  getSelectedProjects,
  getIsUsingComponents,
} = require("../utils/getSelectedProjects");
const promptForProject = require("../utils/promptForProject");

function quit(exitCode = 2) {
  console.log("\nExiting Ditto CLI...\n");
  process.exitCode = exitCode;
  process.exit();
}

function saveProject(file, name, id) {
  // old functionality included "components" in the `projects`
  // array, but we want to always treat the component library as a separate
  // entity and use the new notation of a top-level `components` key
  if (id === "components") {
    config.writeData(file, { components: true });
    return;
  }

  const projects = [...getSelectedProjects(), { name, id }];

  config.writeData(file, { projects });
}

function needsSource() {
  return !config.parseSourceInformation().hasSourceData;
}

async function askForAnotherToken() {
  config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
  const message =
    "Looks like the API key you have saved no longer works. Please enter another one.";
  await collectAndSaveToken(message);
}

async function listProjects(
  token,
  projectsAlreadySelected,
  componentsSelected
) {
  const spinner = ora("Fetching projects in your workspace...");
  spinner.start();

  let projects = [];

  try {
    projects = await api.get("/project-names", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
  } catch (e) {
    spinner.stop();
    throw e;
  }

  spinner.stop();

  return projects.data.filter(({ id }) => {
    if (id === "ditto_component_library") {
      return !componentsSelected;
    } else {
      return !projectsAlreadySelected.some((project) => project.id === id);
    }
  });
}

async function collectProject(token, initialize) {
  const path = process.cwd();
  if (initialize) {
    console.log(
      `Looks like there are no Ditto projects selected for your current directory: ${output.info(
        path
      )}.`
    );
  }

  const projectsAlreadySelected = getSelectedProjects();
  const usingComponents = getIsUsingComponents();
  const projects = await listProjects(
    token,
    projectsAlreadySelected,
    usingComponents
  );

  if (!(projects && projects.length)) {
    console.log("You're currently syncing all projects in your workspace.");
    console.log(
      output.warnText(
        "Not seeing a project that you were expecting? Verify that developer mode is enabled on that project. More info: https://www.dittowords.com/docs/ditto-developer-mode"
      )
    );
    return null;
  }

  const nonInitPrompt = usingComponents
    ? "Add a project"
    : "Add a project or library";

  return promptForProject({
    projects,
    message: initialize
      ? "Choose the project or library you'd like to sync text from"
      : nonInitPrompt,
  });
}

async function collectAndSaveProject(initialize = false) {
  try {
    const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
    const project = await collectProject(token, initialize);
    if (!project) {
      quit(0);
      return;
    }

    console.log(
      "\n" +
        `Thanks for adding ${output.info(
          project.name
        )} to your selected projects.\n` +
        `We saved your updated configuration to: ${output.info(
          consts.PROJECT_CONFIG_FILE
        )}\n`
    );

    saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
  } catch (e) {
    console.log(e);
    if (e.response && e.response.status === 404) {
      await askForAnotherToken();
      await collectAndSaveProject();
    } else {
      quit();
    }
  }
}

module.exports = { needsSource, collectAndSaveProject };
