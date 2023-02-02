import fs from "fs";
import path from "path";
import consts from "../consts";
import output from "../output";
import { Project } from "../types";

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

export function generateJsDriver(
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
