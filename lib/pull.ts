import fs from "fs";
import path from "path";

import ora from "ora";

import api from "./api";
import config from "./config";
import consts from "./consts";
import output from "./output";
import { collectAndSaveToken } from "./init/token";
import sourcesToText from "./utils/sourcesToText";
import { SourceInformation, Token, Project } from "./types";

const NON_DEFAULT_FORMATS = ["flat", "structured", "android", "ios-strings"];

const DEFAULT_FORMAT_KEYS = ["projects", "exported_at"];
const hasVariantData = (data: any) => {
  const hasTopLevelKeys =
    Object.keys(data).filter((key) => !DEFAULT_FORMAT_KEYS.includes(key))
      .length > 0;

  const hasProjectKeys = data.projects && Object.keys(data.projects).length > 0;

  return hasTopLevelKeys || hasProjectKeys;
};

async function askForAnotherToken() {
  config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
  const message =
    "Looks like the API key you have saved no longer works. Please enter another one.";
  await collectAndSaveToken(message);
}

function getExtension(format: string) {
  if (format === "android") {
    return ".xml";
  }
  if (format === "ios-strings") {
    return ".strings";
  }
  return ".json";
}

/**
 * For a given variant:
 * - if format is unspecified, fetch data for all projects from `/projects` and
 * save in `{variantApiId}.json`
 * - if format is `flat` or `structured`, fetch data for each project from `/project/:project_id` and
 * save in `{projectName}-${variantApiId}.json`
 */
async function downloadAndSaveVariant(
  variantApiId: string | null,
  projects: Project[],
  format: string | undefined,
  token?: Token
) {
  const params: Record<string, string | null> = {
    variant: variantApiId,
  };
  if (format) {
    params.format = format;
  }

  if (format && NON_DEFAULT_FORMATS.includes(format)) {
    const savedMessages = await Promise.all(
      projects.map(async ({ id, fileName }: Project) => {
        const { data } = await api.get(`/projects/${id}`, {
          params,
          headers: { Authorization: `token ${token}` },
        });

        if (!hasVariantData(data)) {
          return "";
        }

        const extension = getExtension(format);

        const filename =
          fileName + ("__" + (variantApiId || "base")) + extension;
        const filepath = path.join(consts.TEXT_DIR, filename);

        let dataString = data;
        if (extension === ".json") {
          dataString = JSON.stringify(data, null, 2);
        }

        fs.writeFileSync(filepath, dataString);

        return getSavedMessage(filename);
      })
    );

    return savedMessages.join("");
  } else {
    const { data } = await api.get("/projects", {
      params: { ...params, projectIds: projects.map(({ id }) => id) },
      headers: { Authorization: `token ${token}` },
    });

    if (!hasVariantData(data)) {
      return "";
    }

    const filename = `${variantApiId || "base"}.json`;
    const filepath = path.join(consts.TEXT_DIR, filename);

    const dataString = JSON.stringify(data, null, 2);

    fs.writeFileSync(filepath, dataString);

    return getSavedMessage(filename);
  }
}

async function downloadAndSaveVariants(
  projects: Project[],
  format: string | undefined,
  token?: Token,
  options?: PullOptions
) {
  const meta = options ? options.meta : {};

  const { data: variants } = await api.get("/variants", {
    params: {
      ...meta,
      projectIds: projects.map(({ id }) => id),
    },
    headers: { Authorization: `token ${token}` },
  });

  const messages = await Promise.all([
    downloadAndSaveVariant(null, projects, format, token),
    ...variants.map(({ apiID }: { apiID: string }) =>
      downloadAndSaveVariant(apiID, projects, format, token)
    ),
  ]);

  return messages.join("");
}

async function downloadAndSaveBase(
  projects: Project[],
  format: string | undefined,
  token?: Token,
  options?: PullOptions
) {
  const meta = options ? options.meta : {};

  const params = {
    ...meta,
  };
  if (format) {
    params.format = format;
  }

  if (format && NON_DEFAULT_FORMATS.includes(format)) {
    const savedMessages = await Promise.all(
      projects.map(async ({ id, fileName }: Project) => {
        const { data } = await api.get(`/projects/${id}`, {
          params,
          headers: { Authorization: `token ${token}` },
        });

        const extension = getExtension(format);
        const filename = `${fileName}${extension}`;
        const filepath = path.join(consts.TEXT_DIR, filename);

        let dataString = data;
        if (extension === ".json") {
          dataString = JSON.stringify(data, null, 2);
        }

        fs.writeFileSync(filepath, dataString);

        return getSavedMessage(filename);
      })
    );

    return savedMessages.join("");
  } else {
    const { data } = await api.get(`/projects`, {
      params: { ...params, projectIds: projects.map(({ id }) => id) },
      headers: { Authorization: `token ${token}` },
    });

    const dataString = JSON.stringify(data, null, 2);

    fs.writeFileSync(consts.TEXT_FILE, dataString);

    return getSavedMessage("text.json");
  }
}

function getSavedMessage(file: string) {
  return `Successfully saved to ${output.info(file)}\n`;
}

function cleanOutputFiles() {
  if (!fs.existsSync(consts.TEXT_DIR)) {
    fs.mkdirSync(consts.TEXT_DIR);
  }

  const fileNames = fs.readdirSync(consts.TEXT_DIR);
  fileNames.forEach((fileName) => {
    if (/\.js(on)?|\.xml|\.strings$/.test(fileName)) {
      fs.unlinkSync(path.resolve(consts.TEXT_DIR, fileName));
    }
  });

  return "Cleaning old output files..\n";
}

// compatability with legacy method of specifying project ids
// that is still used by the default format
const stringifyProjectId = (projectId: string) =>
  projectId === "ditto_component_library" ? projectId : `project_${projectId}`;

/**
 * Generates an index.js file that can be consumed
 * by an SDK - this is a big DX improvement because
 * it provides a single entry point to get all data
 * (including variants) instead of having to import
 * each generated file individually.
 *
 * The generated file will have a unified format
 * independent of the CLI configuration used to fetch
 * data from Ditto.
 */
function generateJsDriver(
  projects: Project[],
  variants: boolean,
  format: string | undefined
) {
  const fileNames = fs
    .readdirSync(consts.TEXT_DIR)
    .filter((fileName) => /\.json$/.test(fileName));

  const projectIdsByName: Record<string, string> = projects.reduce(
    (agg, project) => {
      if (project.fileName) {
        return { ...agg, [project.fileName]: project.id };
      }
      return agg;
    },
    {}
  );

  const data = fileNames.reduce(
    (obj: Record<string, Record<string, string>>, fileName) => {
      // filename format: {project-name}__{variant-api-id}.json
      // file format: flat or structured
      if (variants && format) {
        const [projectName, rest] = fileName.split("__");
        const [variantApiId] = rest.split(".");

        const projectId = projectIdsByName[projectName];
        if (!projectId) {
          throw new Error(`Couldn't find id for ${projectName}`);
        }

        const projectIdStr = stringifyProjectId(projectId);

        if (!obj[projectIdStr]) {
          obj[projectIdStr] = {};
        }

        obj[projectIdStr][variantApiId] = `require('./${fileName}')`;
      }
      // filename format: {variant-api-id}.json
      // file format: default
      else if (variants) {
        const file = require(path.resolve(consts.TEXT_DIR, `./${fileName}`));
        const [variantApiId] = fileName.split(".");

        Object.keys(file.projects).forEach((projectId) => {
          if (!obj[projectId]) {
            obj[projectId] = {};
          }

          const project = file.projects[projectId];
          obj[projectId][variantApiId] = project.frames || project.components;
        });
      }
      // filename format: {project-name}.json
      // file format: flat or structured
      else if (format) {
        const [projectName] = fileName.split(".");
        const projectId = projectIdsByName[projectName];
        if (!projectId) {
          throw new Error(`Couldn't find id for ${projectName}`);
        }

        obj[stringifyProjectId(projectId)] = {
          base: `require('./${fileName}')`,
        };
      }
      // filename format: text.json (single file)
      // file format: default
      else {
        const file = require(path.resolve(consts.TEXT_DIR, `./${fileName}`));
        Object.keys(file.projects).forEach((projectId) => {
          const project = file.projects[projectId];
          obj[projectId] = { base: project.frames || project.components };
        });
      }

      return obj;
    },
    {}
  );

  let dataString = `module.exports = ${JSON.stringify(data, null, 2)}`
    // remove quotes around require statements
    .replace(/"require\((.*)\)"/g, "require($1)");

  const filePath = path.resolve(consts.TEXT_DIR, "index.js");
  fs.writeFileSync(filePath, dataString, { encoding: "utf8" });

  return `Generated .js SDK driver at ${output.info(filePath)}`;
}

async function downloadAndSave(
  sourceInformation: SourceInformation,
  token?: Token,
  options?: PullOptions
) {
  const { validProjects, variants, format, shouldFetchComponentLibrary } =
    sourceInformation;

  let msg = `\nFetching the latest text from ${sourcesToText(
    validProjects,
    shouldFetchComponentLibrary
  )}\n`;

  const spinner = ora(msg);
  spinner.start();

  // We'll need to move away from this solution if at some
  // point down the road we stop allowing the component
  // library to be returned from the /projects endpoint
  if (shouldFetchComponentLibrary) {
    validProjects.push({
      id: "ditto_component_library",
      name: "Ditto Component Library",
      fileName: "ditto-component-library",
    });
  }

  try {
    msg += cleanOutputFiles();

    const meta = options ? options.meta : {};
    msg += variants
      ? await downloadAndSaveVariants(validProjects, format, token, { meta })
      : await downloadAndSaveBase(validProjects, format, token, { meta });

    msg += generateJsDriver(validProjects, variants, format);

    msg += `\n${output.success("Done")}!`;

    spinner.stop();
    return console.log(msg);
  } catch (e: any) {
    spinner.stop();
    let error = e.message;
    if (e.response && e.response.status === 404) {
      await askForAnotherToken();
      pull();
      return;
    }
    if (e.response && e.response.status === 401) {
      error = "You don't have access to the selected projects";
      msg = `${output.errorText(error)}.\nChoose others using the ${output.info(
        "project"
      )} command, or update your API key.`;
      return console.log(msg);
    }
    if (e.response && e.response.status === 403) {
      error =
        "One or more of the requested projects don't have Developer Mode enabled";
      msg = `${output.errorText(
        error
      )}.\nPlease choose different projects using the ${output.info(
        "project"
      )} command, or turn on Developer Mode for all selected projects. Learn more here: ${output.subtle(
        "https://www.dittowords.com/docs/ditto-developer-mode"
      )}.`;
      return console.log(msg);
    }
    if (e.response && e.response.status === 400) {
      error = "projects not found";
    }
    msg = `We hit an error fetching text from the projects: ${output.errorText(
      error
    )}.\nChoose others using the ${output.info("project")} command.`;
    return console.log(msg);
  }
}

interface PullOptions {
  meta?: Record<string, string>;
}

export const pull = (options?: PullOptions) => {
  const meta = options ? options.meta : {};
  const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
  const sourceInformation = config.parseSourceInformation();

  return downloadAndSave(sourceInformation, token, { meta });
};

export default {
  pull,
  _testing: {
    cleanOutputFiles,
    downloadAndSaveVariant,
    downloadAndSaveVariants,
    downloadAndSaveBase,
  },
};
