import fetchText, { PullFilters, TextItemsResponse } from "../http/pull";
import { ProjectConfigYAML } from "../services/projectConfig";
import appContext from "../utils/appContext";

function formatTextItems(textItems: TextItemsResponse) {
  for (const output of appContext.selectedProjectConfigOutputs) {
    switch (output.format) {
      case "i18next":
        break;
      default:
        throw new Error(`Unsupported format: ${output.format}`);
    }
  }
}

function generatePullFilters(
  config: ProjectConfigYAML = appContext.projectConfig
) {
  const { projects, variants } = config;

  let filters: PullFilters = {};

  if (projects) {
    filters.projects = projects.map((project) => ({ id: project.id }));
  }

  if (variants) {
    filters.variants = variants.map((variant) => ({ id: variant.id }));
  }

  if (!filters.projects && !filters.variants) {
    return undefined;
  }

  return filters;
}

async function downloadAndSave() {
  const filters = generatePullFilters();

  try {
    const textItems = await fetchText(appContext.apiTokenOrThrow, filters);

    console.log(textItems);

    formatTextItems(textItems);
  } catch (e) {
    // TODO: Handle errors gracefully.
    console.error(e);
    process.exit(1);
  }
}

export const pull = async () => {
  await downloadAndSave();
};
