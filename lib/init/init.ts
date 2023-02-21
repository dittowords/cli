// Related to initializing a user/environment to ditto.
// expected to be run once per project.
import boxen from "boxen";
import chalk from "chalk";
import projectsToText from "../utils/projectsToText";

import { needsSource, collectAndSaveSource } from "./project";
import { needsToken, collectAndSaveToken } from "./token";

import config from "../config";
import output from "../output";
import sourcesToText from "../utils/sourcesToText";
import { quit } from "../utils/quit";

export const needsTokenOrSource = () => needsToken() || needsSource();

function welcome() {
  const msg = chalk.white(`${chalk.bold(
    "Welcome to the",
    chalk.magentaBright("Ditto CLI")
  )}.

We're glad to have you here.`);
  console.log(boxen(msg, { padding: 1 }));
}

export const init = async () => {
  welcome();

  if (needsToken()) {
    await collectAndSaveToken();
  }

  const {
    hasSourceData,
    validProjects,
    shouldFetchComponentLibrary,
    hasTopLevelComponentsField,
    hasTopLevelProjectsField,
  } = config.parseSourceInformation();

  if (hasTopLevelProjectsField) {
    return quit(`${output.errorText(
      `Support for ${output.warnText(
        "projects"
      )} as a top-level field has been removed; please configure ${output.warnText(
        "sources.projects"
      )} instead.`
    )}
See ${output.url("https://github.com/dittowords/cli")} for more information.`);
  }

  if (hasTopLevelComponentsField) {
    return quit(
      `${output.errorText(
        "Support for `components` as a top-level field has been removed; please configure `sources.components` instead."
      )}
See ${output.url("https://github.com/dittowords/cli")} for more information.`
    );
  }

  if (!hasSourceData) {
    console.log(
      `Looks like there are no Ditto sources selected for your current directory: ${output.info(
        process.cwd()
      )}.`
    );
    await collectAndSaveSource({ initialize: true, components: true });
    return;
  }

  const message =
    "You're currently set up to sync text from " +
    sourcesToText(validProjects, shouldFetchComponentLibrary);

  console.log(message);
};

export default { init };
