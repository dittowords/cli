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
 *
 */
type DriverFile = Record<string, Record<string, string | object>>;
export function generateJsDriver(sources: Source[]) {
  const moduleType = determineModuleType();

  const fullyQualifiedSources = getFullyQualifiedJSONSources(sources);

  const variableNameGenerator = createVariableNameGenerator();
  const importStatements: string[] = [];

  const dataComponents: Record<string, string[]> = {};
  const dataProjects: DriverFile = {};

  fullyQualifiedSources.forEach((source) => {
    let variableName: string;
    if (source.type === "components") {
      variableName = variableNameGenerator.generate(
        source.fileName.split(".")[0]
      );
    } else {
      const fileNameWithoutExtension = source.fileName.split(".")[0];
      variableName = variableNameGenerator.generate(
        fileNameWithoutExtension.split("__")[0]
      );
    }

    importStatements.push(
      getImportStatement(source.fileName, variableName, moduleType)
    );

    if (source.type === "project") {
      const { variantApiId } = source;
      const projectId = stringifySourceId(source.projectId);
      dataProjects[projectId] ??= {};
      dataProjects[projectId][variantApiId] = `{...${variableName}}`;
    } else {
      dataComponents[source.variantApiId] ??= [];
      dataComponents[source.variantApiId].push(`...${variableName}`);
    }
  });

  // Convert each array of stringified "...require()" statements
  // into a unified string, and set it on the final data object
  // that will be written to the driver file
  Object.keys(dataComponents).forEach((key) => {
    dataProjects.ditto_component_library ??= {};

    let str = "{";
    dataComponents[key].forEach((k: any, i: any) => {
      str += k;
      if (i < dataComponents[key].length - 1) str += ", ";
    });
    str += "}";
    dataProjects.ditto_component_library[key] = str;
  });

  let dataString = "";
  dataString += importStatements.join("\n") + "\n\n";
  dataString += `${getExportPrefix(moduleType)}`;
  dataString += `${JSON.stringify(dataProjects, null, 2)}`
    // remove quotes around opening & closing curlies
    .replace(/"\{/g, "{")
    .replace(/\}"/g, "}");

  const filePath = path.resolve(consts.TEXT_DIR, "index.js");
  fs.writeFileSync(filePath, dataString, { encoding: "utf8" });

  return `Generated .js SDK driver at ${output.info(filePath)}`;
}

type IFullyQualifiedJSONSource =
  | {
      type: "components";
      variantApiId: string;
      folderApiId: string;
      fileName: string;
    }
  | {
      type: "project";
      projectId: string;
      projectName: string;
      variantApiId: string;
      fileName: string;
    };

function getFullyQualifiedJSONSources(
  sources: Source[]
): IFullyQualifiedJSONSource[] {
  const projectIdsByCleanedFileName = new Map<string, string>();
  sources.forEach((source) => {
    if (!source.fileName || source.type === "components") {
      return;
    }
    projectIdsByCleanedFileName.set(cleanFileName(source.fileName), source.id);
  });

  const fileNames = fs.readdirSync(consts.TEXT_DIR);
  return fileNames
    .filter((f) => path.extname(f) === ".json")
    .map((fileName) => {
      const parts = fileName.split("__");

      if (parts.length === 3) {
        const [, folderApiId, rest] = parts;
        const [variantApiId] = rest.split(".");
        return {
          type: "components",
          variantApiId,
          folderApiId,
          fileName,
        };
      }

      if (parts.length === 2) {
        const [projectName, rest] = parts;
        const [variantApiId] = rest.split(".");
        const key = cleanFileName(fileName.split("__")[0]);
        const projectId = projectIdsByCleanedFileName.get(key) || "";
        return {
          type: "project",
          projectId,
          projectName,
          variantApiId,
          fileName,
        };
      }

      throw new Error("Invalid JSON file generated: " + fileName);
    });
}

function createVariableNameGenerator() {
  const variableNames = new Set<string>();

  return {
    generate: (str: string) => {
      const baseName = str.replace(/(\W|-)/g, "_");
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

function getExportPrefix(moduleType: "commonjs" | "module") {
  if (moduleType === "commonjs") {
    return "module.exports = ";
  }
  if (moduleType === "module") {
    return "export default ";
  }
  throw new Error("Unknown module type: " + moduleType);
}

function getImportStatement(
  fileName: string,
  variableName: string,
  moduleType: "commonjs" | "module"
) {
  if (moduleType === "commonjs") {
    return `const ${variableName} = require('./${fileName}');`;
  }
  if (moduleType === "module") {
    return `import ${variableName} from './${fileName}';`;
  }
  throw new Error("Unknown module type: " + moduleType);
}
