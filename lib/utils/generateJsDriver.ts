import fs from "fs";
import path from "path";
import consts from "../consts";
import output from "../output";
import { Source } from "../types";
import { cleanFileName } from "./cleanFileName";

// compatability with legacy method of specifying project ids
// that is still used by the default format
const stringifySourceId = (projectId: string) =>
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

// TODO: support ESM
export function generateJsDriver(sources: Source[]) {
  const sourceIdsByName: Record<string, string> = sources.reduce(
    (agg, source) => {
      if (source.fileName) {
        return { ...agg, [cleanFileName(source.fileName)]: source.id };
      }

      return agg;
    },
    {}
  );

  const projectFileNames = fs
    .readdirSync(consts.TEXT_DIR)
    .filter(
      (fileName) => /\.json$/.test(fileName) && !/^components__/.test(fileName)
    );

  type DriverFile = Record<string, Record<string, string | object>>;
  const data: DriverFile = projectFileNames.reduce(
    (obj: Record<string, Record<string, string>>, fileName) => {
      const [sourceId, rest] = fileName.split("__");
      const [variantApiId] = rest.split(".");

      const projectId = sourceIdsByName[sourceId];
      const projectIdStr = stringifySourceId(projectId);

      if (!obj[projectIdStr]) {
        obj[projectIdStr] = {};
      }

      obj[projectIdStr][variantApiId] = `require('./${fileName}')`;
      return obj;
    },
    {}
  );

  // Create arrays of stringified "...require()" statements,
  // each of which corresponds to one of the component files
  // (which are created on a per-component-folder basis)
  const componentData: Record<string, string[]> = {};
  sources
    .filter((s) => s.type === "components")
    .forEach((componentSource) => {
      if (componentSource.type !== "components") return;
      componentData[componentSource.variant] ??= [];
      componentData[componentSource.variant].push(
        `...require('./${componentSource.fileName}')`
      );
    });
  // Convert each array of stringified "...require()" statements
  // into a unified string, and set it on the final data object
  // that will be written to the driver file
  Object.keys(componentData).forEach((key) => {
    data.ditto_component_library ??= {};

    let str = "{";
    componentData[key].forEach((k, i) => {
      str += k;
      if (i < componentData[key].length - 1) str += ", ";
    });
    str += "}";
    data.ditto_component_library[key] = str;
  });

  let dataString = `module.exports = ${JSON.stringify(data, null, 2)}`
    // remove quotes around require statements
    .replace(/"require\((.*)\)"/g, "require($1)")
    // remove quotes around opening & closing curlies
    .replace(/"\{/g, "{")
    .replace(/\}"/g, "}");

  const filePath = path.resolve(consts.TEXT_DIR, "index.js");
  fs.writeFileSync(filePath, dataString, { encoding: "utf8" });

  return `Generated .js SDK driver at ${output.info(filePath)}`;
}
