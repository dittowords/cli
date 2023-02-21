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
  const fileNames = fs
    .readdirSync(consts.TEXT_DIR)
    .filter((fileName) => /\.json$/.test(fileName));

  const sourceIdsByName: Record<string, string> = sources.reduce(
    (agg, source) => {
      if (source.fileName) {
        return { ...agg, [cleanFileName(source.fileName)]: source.id };
      }

      return agg;
    },
    {}
  );

  const data = fileNames.reduce(
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

  let dataString = `module.exports = ${JSON.stringify(data, null, 2)}`
    // remove quotes around require statements
    .replace(/"require\((.*)\)"/g, "require($1)");

  const filePath = path.resolve(consts.TEXT_DIR, "index.js");
  fs.writeFileSync(filePath, dataString, { encoding: "utf8" });

  return `Generated .js SDK driver at ${output.info(filePath)}`;
}
