import fs from "fs";
import path from "path";
import consts from "../consts";
import output from "../output";
import { Source } from "../types";
import { cleanFileName } from "./cleanFileName";
import { determineModuleType } from "./determineModuleType";

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

export function generateJsDriver(sources: Source[]) {
  const moduleType = determineModuleType();

  let filePath: string;
  if (moduleType === "commonjs") {
    filePath = generateJsDriverCommonJS(sources, moduleType);
  } else if (moduleType === "module") {
    filePath = generateJsDriverESM(sources);
  } else {
    throw new Error(`Unknown module type: ${moduleType}`);
  }

  return `Generated .js SDK driver at ${output.info(filePath)}`;
}

function generateJsDriverCommonJS(
  sources: Source[],
  moduleType: "commonjs" | "esm"
) {
  const variableNameGenerator = createVariableNameGenerator();
  const importStatements: string[] = [];

  const sourceInfoByName: Record<
    string,
    {
      projectId: string;
      variableName: string;
      importStatement: string;
      requireStatement: string;
    }
  > = {};

  const data2: DriverFile = {};

  sources.forEach((source) => {
    if (!source.fileName) {
      return;
    }

    const fileName = cleanFileName(source.fileName);
    console.log("source.fileName", source.fileName);
    const variableName = variableNameGenerator.generate(fileName.split(".")[0]);

    const importStatement = `import ${variableName} from './${source.fileName}';`;
    const requireStatement = `const ${variableName} = require('./${source.fileName}');`;

    sourceInfoByName[fileName] = {
      projectId: source.id,
      variableName,
      importStatement,
      requireStatement,
    };
  });

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

      const sourceInfo = sourceInfoByName[sourceId];
      const projectIdStr = stringifySourceId(sourceInfo.projectId);

      if (!obj[projectIdStr]) {
        obj[projectIdStr] = {};
      }

      obj[projectIdStr][variantApiId] = `require('./${fileName}')`;
      return obj;
    },
    {}
  );

  console.log("data", data);

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

  let dataString = "";

  Object.values(sourceInfoByName).forEach((sourceInfo) => {
    if (moduleType === "commonjs") {
      dataString += `${sourceInfo.requireStatement}\n`;
      return;
    }
    if (moduleType === "esm") {
      dataString += `${sourceInfo.importStatement}\n`;
      return;
    }
    throw new Error("Unknown module type: " + moduleType);
  });

  dataString += "\n";
  dataString += `${getExportPrefix(moduleType)}

  dataString += ${JSON.stringify(data, null, 2)}`
    // remove quotes around require statements
    .replace(/"require\((.*)\)"/g, "require($1)")
    // remove quotes around opening & closing curlies
    .replace(/"\{/g, "{")
    .replace(/\}"/g, "}");

  const filePath = path.resolve(consts.TEXT_DIR, "index.js");
  fs.writeFileSync(filePath, dataString, { encoding: "utf8" });

  return filePath;
}

function createVariableNameGenerator() {
  const variableNames = new Set<string>();

  return {
    generate: (str: string) => {
      const baseName = str.replace(/\W/g, "_");
      let name = baseName;
      let i = 1;
      while (variableNames.has(name)) {
        name = `${baseName}${i}`;
        i++;
      }
      variableNames.add(name);
      return name;
    },
  };
}

function generateJsDriverESM(sources: Source[]) {
  return "";
}

function getExportPrefix(moduleType: "commonjs" | "esm") {
  if (moduleType === "commonjs") {
    return "module.exports = ";
  }
  if (moduleType === "esm") {
    return "export default ";
  }
  throw new Error("Unknown module type: " + moduleType);
}
