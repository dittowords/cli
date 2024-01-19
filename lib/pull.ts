import fs from "fs";
import path from "path";

import ora from "ora";
import * as Sentry from "@sentry/node";

import { createApiClient } from "./api";
import config from "./config";
import consts from "./consts";
import output from "./output";
import { collectAndSaveToken } from "./init/token";
import sourcesToText from "./utils/sourcesToText";
import { generateJsDriver } from "./utils/generateJsDriver";
import { cleanFileName } from "./utils/cleanFileName";
import {
  SourceInformation,
  Token,
  Project,
  SupportedFormat,
  ComponentFolder,
  ComponentSource,
  Source,
} from "./types";
import { fetchVariants } from "./http/fetchVariants";
import { quit } from "./utils/quit";
import { AxiosError } from "axios";
import { fetchComponentFolders } from "./http/fetchComponentFolders";
import { generateSwiftDriver } from "./utils/generateSwiftDriver";
import { generateIOSBundles } from "./utils/generateIOSBundles";

interface IRequestOptions {
  projects: Project[];
  format: SupportedFormat;
  status: string | undefined;
  richText?: boolean | undefined;
  token?: Token;
  options?: PullOptions;
}

interface IRequestOptionsWithVariants extends IRequestOptions {
  variants: { apiID: string }[];
}

const ensureEndsWithNewLine = (str: string) =>
  str + (/[\r\n]$/.test(str) ? "" : "\n");

export const writeFile = (path: string, data: string) =>
  new Promise((r) => fs.writeFile(path, ensureEndsWithNewLine(data), r));

const SUPPORTED_FORMATS: SupportedFormat[] = [
  "flat",
  "structured",
  "android",
  "ios-strings",
  "ios-stringsdict",
  "icu",
];

export type JSONFormat = "flat" | "nested" | "structured" | "icu";

const IOS_FORMATS: SupportedFormat[] = ["ios-strings", "ios-stringsdict"];
const JSON_FORMATS: JSONFormat[] = ["flat", "structured", "icu"];

const getJsonFormat = (formats: string[]): JSONFormat => {
  // edge case: multiple json formats specified
  // we should grab the last one
  const jsonFormats = formats.filter((f) =>
    JSON_FORMATS.includes(f as JSONFormat)
  ) as JSONFormat[];

  return jsonFormats[jsonFormats.length - 1] || "flat";
};

const FORMAT_EXTENSIONS = {
  flat: ".json",
  structured: ".json",
  android: ".xml",
  "ios-strings": ".strings",
  "ios-stringsdict": ".stringsdict",
  icu: ".json",
};

const getJsonFormatIsValid = (data: string) => {
  try {
    return Object.keys(JSON.parse(data)).some(
      (k) => !k.startsWith("__variant")
    );
  } catch {
    return false;
  }
};

// exported for test usage only
export const getFormatDataIsValid = {
  flat: getJsonFormatIsValid,
  structured: getJsonFormatIsValid,
  icu: getJsonFormatIsValid,
  android: (data: string) => data.includes("<string"),
  "ios-strings": (data: string) => data.includes(`" = "`),
  "ios-stringsdict": (data: string) => data.includes("<key>"),
};

const getFormat = (
  formatFromSource: string | string[] | undefined
): SupportedFormat[] => {
  const formats = (
    Array.isArray(formatFromSource) ? formatFromSource : [formatFromSource]
  ).filter((format) =>
    SUPPORTED_FORMATS.includes(format as SupportedFormat)
  ) as SupportedFormat[];

  if (formats.length) {
    return formats;
  }

  return ["flat"];
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
  requestOptions: IRequestOptions
) {
  const { projects, format, status, richText, token } = requestOptions;
  const api = createApiClient();
  const params: Record<string, string | null> = { variant: variantApiId };
  if (format) params.format = format;
  if (richText) params.includeRichText = richText.toString();

  // Root-level status gets set as the default if specified
  if (status) params.status = status;

  const savedMessages = await Promise.all(
    projects.map(async (project) => {
      const projectParams = { ...params };
      // If project-level status is specified, overrides root-level status
      if (project.status) projectParams.status = project.status;
      if (project.exclude_components)
        projectParams.exclude_components = String(project.exclude_components);

      const { data } = await api.get(`/v1/projects/${project.id}`, {
        params: projectParams,
        headers: { Authorization: `token ${token}` },
      });

      if (!hasVariantData(data)) {
        return "";
      }

      const extension = getFormatExtension(format);

      const filename = cleanFileName(
        project.fileName + ("__" + (variantApiId || "base")) + extension
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

      await writeFile(filepath, dataString);
      return getSavedMessage(filename);
    })
  );

  return savedMessages.join("");
}

async function downloadAndSaveVariants(
  requestOptions: IRequestOptionsWithVariants
) {
  const messages = await Promise.all([
    downloadAndSaveVariant(null, requestOptions),
    ...requestOptions.variants.map(({ apiID }: { apiID: string }) =>
      downloadAndSaveVariant(apiID, requestOptions)
    ),
  ]);

  return messages.join("");
}

async function downloadAndSaveBase(requestOptions: IRequestOptions) {
  const { projects, format, status, richText, token, options } = requestOptions;

  const api = createApiClient();
  const params = { ...options?.meta };
  if (format) params.format = format;
  if (richText) params.includeRichText = richText.toString();

  // Root-level status gets set as the default if specified
  if (status) params.status = status;

  const savedMessages = await Promise.all(
    projects.map(async (project) => {
      const projectParams = { ...params };
      // If project-level status is specified, overrides root-level status
      if (project.status) projectParams.status = project.status;
      if (project.exclude_components)
        projectParams.exclude_components = String(project.exclude_components);

      const { data } = await api.get(`/v1/projects/${project.id}`, {
        params: projectParams,
        headers: { Authorization: `token ${token}` },
      });

      const extension = getFormatExtension(format);
      const filename = cleanFileName(`${project.fileName}__base${extension}`);
      const filepath = path.join(consts.TEXT_DIR, filename);

      let dataString = data;
      if (extension === ".json") {
        dataString = JSON.stringify(data, null, 2);
      }

      const dataIsValid = getFormatDataIsValid[format];
      if (!dataIsValid(dataString)) {
        return "";
      }

      await writeFile(filepath, dataString);
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

  const directoryContents = fs.readdirSync(consts.TEXT_DIR, {
    withFileTypes: true,
  });

  directoryContents.forEach((item) => {
    if (item.isDirectory() && /\.lproj$/.test(item.name)) {
      return fs.rmSync(path.resolve(consts.TEXT_DIR, item.name), {
        recursive: true,
        force: true,
      });
    }

    if (
      item.isFile() &&
      /\.js(on)?|\.xml|\.strings(dict)?$|\.swift$/.test(item.name)
    ) {
      return fs.unlinkSync(path.resolve(consts.TEXT_DIR, item.name));
    }
  });

  return "Cleaning old output files..\n";
}

async function downloadAndSave(
  source: SourceInformation,
  token?: Token,
  options?: PullOptions
) {
  const api = createApiClient();
  const {
    validProjects,
    format: formatFromSource,
    shouldFetchComponentLibrary,
    status,
    richText,
    componentFolders: specifiedComponentFolders,
    componentRoot,
    localeByVariantApiId,
  } = source;

  const formats = getFormat(formatFromSource);

  const hasJSONFormat = formats.some((f) =>
    JSON_FORMATS.includes(f as JSONFormat)
  );
  const hasIOSFormat = formats.some((f) => IOS_FORMATS.includes(f));
  const shouldGenerateIOSBundles = hasIOSFormat && localeByVariantApiId;

  const shouldLogOutputFiles = !shouldGenerateIOSBundles;

  let msg = "";
  const spinner = ora(msg);
  spinner.start();

  const [variants, allComponentFoldersResponse] = await Promise.all([
    fetchVariants(source),
    fetchComponentFolders({}),
  ]);

  const allComponentFolders = Object.entries(
    allComponentFoldersResponse
  ).reduce(
    (acc, [id, name]) => acc.concat([{ id, name }]),
    [] as ComponentFolder[]
  );

  try {
    msg += cleanOutputFiles();
    msg += `\nFetching the latest text from ${sourcesToText(
      validProjects,
      shouldFetchComponentLibrary
    )}\n`;

    const meta = options ? options.meta : {};

    const rootRequest = {
      id: "__root__",
      name: "Root",
      // componentRoot can be a boolean or an object
      status:
        typeof source.componentRoot === "object"
          ? source.componentRoot.status
          : undefined,
    };

    let componentFolderRequests: ComponentFolder[] = [];

    // there's a lot of complex logic here, and it's tempting to want to
    // simplify it. however, it's difficult to get rid of the complexity
    // without sacrificing specificity and expressiveness.
    //
    // if folders specified..
    if (specifiedComponentFolders) {
      switch (componentRoot) {
        // .. and no root specified, you only get components in the specified folders
        case undefined:
        case false:
          componentFolderRequests.push(...specifiedComponentFolders);
          break;
        // .. and root specified, you get components in folders and the root
        default:
          componentFolderRequests.push(...specifiedComponentFolders);
          componentFolderRequests.push(rootRequest);
          break;
      }
    }
    // if no folders specified..
    else {
      switch (componentRoot) {
        // .. and no root specified, you get all components including those in folders
        case undefined:
          componentFolderRequests.push(...allComponentFolders);
          componentFolderRequests.push(rootRequest);
          break;
        // .. and root specified as false, you only get components in folders
        case false:
          componentFolderRequests.push(...allComponentFolders);
          break;
        // .. and root specified as true or config object, you only get components in the root
        default:
          componentFolderRequests.push(rootRequest);
          break;
      }
    }

    // this array is populated while fetching from the component library and is used when
    // generating the index.js driver file
    const componentSources: ComponentSource[] = [];

    async function fetchComponentLibrary(format: SupportedFormat) {
      // Always include a variant with an apiID of undefined to ensure that we
      // fetch the base text for the component library.
      const componentVariants = [{ apiID: undefined }, ...(variants || [])];

      const params = new URLSearchParams();
      if (options?.meta)
        Object.entries(options.meta).forEach(([k, v]) => params.append(k, v));
      if (format) params.append("format", format);
      if (richText) params.append("includeRichText", richText.toString());

      // Root-level status gets set as the default if specified
      if (status) params.append("status", status);

      const messagePromises: Promise<string>[] = [];

      componentVariants.forEach(({ apiID: variantApiId }) => {
        messagePromises.push(
          ...componentFolderRequests.map(async (componentFolder) => {
            const componentFolderParams = new URLSearchParams(params);

            if (variantApiId)
              componentFolderParams.append("variant", variantApiId);

            // If folder-level status is specified, overrides root-level status
            if (componentFolder.status)
              componentFolderParams.append("status", componentFolder.status);

            const url =
              componentFolder.id === "__root__"
                ? "/v1/components?root_only=true"
                : `/v1/component-folders/${componentFolder.id}/components`;

            const { data } = await api.get(url, {
              params: componentFolderParams,
            });

            const nameExt = getFormatExtension(format);
            const nameBase = "components";

            // we need to clean the folder name by itself first, otherwise we can
            // end up with "empty" words and weird hyphenation.
            const nameFolder = `__${cleanFileName(componentFolder.name)}`;
            const namePostfix = `__${variantApiId || "base"}`;

            const fileName = cleanFileName(
              `${nameBase}${nameFolder}${namePostfix}${nameExt}`
            );
            const filePath = path.join(consts.TEXT_DIR, fileName);

            let dataString = data;
            if (nameExt === ".json") {
              dataString = JSON.stringify(data, null, 2);
            }

            const dataIsValid = getFormatDataIsValid[format];
            if (!dataIsValid(dataString)) {
              return "";
            }

            await writeFile(filePath, dataString);

            componentSources.push({
              type: "components",
              id: "ditto_component_library",
              name: "ditto_component_library",
              fileName,
              variant: variantApiId || "base",
            });

            return getSavedMessage(fileName);
          })
        );
      });

      const messages = await Promise.all(messagePromises);
      if (shouldLogOutputFiles) {
        msg += messages.join("");
      }
    }

    if (shouldFetchComponentLibrary) {
      for (const format of formats) {
        await fetchComponentLibrary(format);
      }
    }

    async function fetchProjects(format: SupportedFormat) {
      let result = "";
      if (variants) {
        result = await downloadAndSaveVariants({
          variants,
          projects: validProjects,
          format,
          status,
          richText,
          token,
        });
      } else {
        result = await downloadAndSaveBase({
          projects: validProjects,
          format,
          status,
          richText,
          token,
          options: {
            meta,
          },
        });
      }

      if (shouldLogOutputFiles) {
        msg += result;
      }
    }

    if (validProjects.length) {
      for (const format of formats) {
        await fetchProjects(format);
      }
    }

    const sources: Source[] = [...validProjects, ...componentSources];

    if (hasJSONFormat) msg += generateJsDriver(sources, getJsonFormat(formats));

    if (shouldGenerateIOSBundles) {
      msg += "iOS locale information detected, generating bundles..\n\n";
      msg += await generateIOSBundles(localeByVariantApiId);
      msg += await generateSwiftDriver(source);
    }

    msg += `\n\n${output.success("Done")}!`;

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

export const pull = async (options?: PullOptions) => {
  const meta = options ? options.meta : {};
  const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
  const sourceInformation = config.parseSourceInformation();

  try {
    return await downloadAndSave(sourceInformation, token, { meta });
  } catch (e) {
    const eventId = Sentry.captureException(e);
    const eventStr = `\n\nError ID: ${output.info(eventId)}`;
    if (e instanceof AxiosError) {
      return quit(
        output.errorText(
          "Something went wrong connecting to Ditto servers. Please contact support or try again later."
        ) + eventStr
      );
    }

    return quit(
      output.errorText(
        "Something went wrong. Please contact support or try again later."
      ) + eventStr
    );
  }
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
