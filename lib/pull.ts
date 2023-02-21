import fs from "fs";
import path from "path";

import ora from "ora";

import api from "./api";
import config from "./config";
import consts from "./consts";
import output from "./output";
import { collectAndSaveToken } from "./init/token";
import sourcesToText from "./utils/sourcesToText";
import { generateJsDriver } from "./utils/generateJsDriver";
import { cleanFileName } from "./utils/cleanFileName";
import { SourceInformation, Token, Project } from "./types";
import { fetchVariants } from "./http/fetchVariants";

type SupportedFormat = "flat" | "structured" | "android" | "ios-strings";

const SUPPORTED_FORMATS: SupportedFormat[] = [
  "flat",
  "structured",
  "android",
  "ios-strings",
];

const JSON_FORMATS: SupportedFormat[] = ["flat", "structured"];

const FORMAT_EXTENSIONS = {
  flat: ".json",
  structured: ".json",
  android: ".xml",
  "ios-strings": ".strings",
};

const getFormatDataIsValid = {
  flat: (data: string) => data !== "{}",
  structured: (data: string) => data !== "{}",
  android: (data: string) => data.includes("<string"),
  "ios-strings": (data: string) => !!data,
};

const getFormat = (formatFromSource: string | undefined): SupportedFormat => {
  const f = formatFromSource as SupportedFormat | undefined;
  if (f && SUPPORTED_FORMATS.includes(f)) {
    return f;
  }

  return "flat";
};

const getFormatExtension = (format: SupportedFormat) => {
  return FORMAT_EXTENSIONS[format];
};

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
  format: SupportedFormat,
  status: string | undefined,
  richText: boolean | undefined,
  token?: Token
) {
  const params: Record<string, string | null> = { variant: variantApiId };
  if (format) params.format = format;
  if (status) params.status = status;
  if (richText) params.includeRichText = richText.toString();

  const savedMessages = await Promise.all(
    projects.map(async ({ id, fileName }: Project) => {
      const { data } = await api.get(`/projects/${id}`, {
        params,
        headers: { Authorization: `token ${token}` },
      });

      if (!hasVariantData(data)) {
        return "";
      }

      const extension = getFormatExtension(format);

      const filename = cleanFileName(
        fileName + ("__" + (variantApiId || "base")) + extension
      );
      const filepath = path.join(consts.TEXT_DIR, filename);

      let dataString = data;
      if (extension === ".json") {
        dataString = JSON.stringify(data, null, 2);
      }

      const dataIsValid = getFormatDataIsValid[format];
      if (!dataIsValid(dataString)) {
        return "";
      }

      fs.writeFileSync(filepath, dataString);
      return getSavedMessage(filename);
    })
  );

  return savedMessages.join("");
}

async function downloadAndSaveVariants(
  variants: { apiID: string }[],
  projects: Project[],
  format: SupportedFormat,
  status: string | undefined,
  richText: boolean | undefined,
  token?: Token
) {
  const messages = await Promise.all([
    downloadAndSaveVariant(null, projects, format, status, richText, token),
    ...variants.map(({ apiID }: { apiID: string }) =>
      downloadAndSaveVariant(apiID, projects, format, status, richText, token)
    ),
  ]);

  return messages.join("");
}

async function downloadAndSaveBase(
  projects: Project[],
  format: SupportedFormat,
  status: string | undefined,
  richText?: boolean | undefined,
  token?: Token,
  options?: PullOptions
) {
  const params = { ...options?.meta };
  if (format) params.format = format;
  if (status) params.status = status;
  if (richText) params.includeRichText = richText.toString();

  const savedMessages = await Promise.all(
    projects.map(async ({ id, fileName }: Project) => {
      const { data } = await api.get(`/projects/${id}`, {
        params,
        headers: { Authorization: `token ${token}` },
      });

      const extension = getFormatExtension(format);
      const filename = cleanFileName(`${fileName}__base${extension}`);
      const filepath = path.join(consts.TEXT_DIR, filename);

      let dataString = data;
      if (extension === ".json") {
        dataString = JSON.stringify(data, null, 2);
      }

      const dataIsValid = getFormatDataIsValid[format];
      if (!dataIsValid(dataString)) {
        return "";
      }

      fs.writeFileSync(filepath, dataString);
      return getSavedMessage(filename);
    })
  );

  return savedMessages.join("");
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

async function downloadAndSave(
  source: SourceInformation,
  token?: Token,
  options?: PullOptions
) {
  const {
    validProjects,
    format: formatFromSource,
    shouldFetchComponentLibrary,
    status,
    richText,
    componentFolders,
  } = source;

  const format = getFormat(formatFromSource);

  let msg = "";
  const spinner = ora(msg);
  spinner.start();

  const variants = await fetchVariants(source);

  try {
    msg += cleanOutputFiles();
    msg += `\nFetching the latest text from ${sourcesToText(
      validProjects,
      shouldFetchComponentLibrary
    )}\n`;

    const meta = options ? options.meta : {};

    if (shouldFetchComponentLibrary) {
      // Always include a variant with an apiID of undefined to ensure that we
      // fetch the base text for the component library.
      const componentVariants = [{ apiID: undefined }, ...(variants || [])];

      const params = new URLSearchParams();
      if (options?.meta)
        Object.entries(options.meta).forEach(([k, v]) => params.append(k, v));
      if (format) params.append("format", format);
      if (status) params.append("status", status);
      if (richText) params.append("includeRichText", richText.toString());
      if (componentFolders) {
        componentFolders.forEach(({ id }) => params.append("folder_id[]", id));
      }

      const messages = await Promise.all(
        componentVariants.map(async ({ apiID: variantApiId }) => {
          const p = new URLSearchParams(params);
          if (variantApiId) p.append("variant", variantApiId);

          const { data } = await api.get(`/components`, { params: p });

          const nameExt = getFormatExtension(format);
          const nameBase = "ditto-component-library";
          const namePostfix = `__${variantApiId || "base"}`;

          const fileName = cleanFileName(`${nameBase}${namePostfix}${nameExt}`);
          const filePath = path.join(consts.TEXT_DIR, fileName);

          let dataString = data;
          if (nameExt === ".json") {
            dataString = JSON.stringify(data, null, 2);
          }

          const dataIsValid = getFormatDataIsValid[format];
          if (!dataIsValid(dataString)) {
            return "";
          }

          await new Promise((r) => fs.writeFile(filePath, dataString, r));
          return getSavedMessage(fileName);
        })
      );

      msg += messages.join("");
    }

    if (validProjects.length) {
      msg += variants
        ? await downloadAndSaveVariants(
            variants,
            validProjects,
            format,
            status,
            richText,
            token
          )
        : await downloadAndSaveBase(
            validProjects,
            format,
            status,
            richText,
            token,
            {
              meta,
            }
          );
    }

    const sources = [...validProjects];
    if (shouldFetchComponentLibrary) {
      sources.push({
        id: "ditto_component_library",
        name: "Ditto Component Library",
        fileName: "ditto-component-library",
      });
    }

    if (JSON_FORMATS.includes(format)) msg += generateJsDriver(sources);

    msg += `\n${output.success("Done")}!`;

    spinner.stop();
    return console.log(msg);
  } catch (e: any) {
    console.error(e);

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

export interface PullOptions {
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
