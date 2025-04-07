import fs from "fs";
import path from "path";
import { ModuleType } from "./determineModuleType";
import { JSONFormat } from "../pull";
import consts from "../consts";

function getFormatString(format: JSONFormat) {
  switch (format) {
    case "flat":
      return "IJSONFlat";
    case "nested":
      return "IJSONNested";
    case "structured":
      return "IJSONStructured";
    case "icu":
      return "IJSONICU";
    default:
      return "_JSON";
  }
}

function getExportString(exportedValue: string, moduleType: ModuleType) {
  if (moduleType === "commonjs") {
    return `export = ${exportedValue};`;
  }

  return `export default ${exportedValue};`;
}

function getTypesString(options: IOptions) {
  return `
interface IJSONFlat {
  [key: string]: string;
}

interface IJSONStructured {
  [key: string]: {
    text: string;
    status?: string;
    notes?: string;
    [property: string]: any;
  };
}

interface IJSONNested {
  [key: string]: string | IJSONNested;
}

type _JSON = IJSONFlat | IJSONStructured | IJSONNested;

interface IDriverFile {
  [sourceKey: string]: {
    [variantKey: string]: ${getFormatString(options.format)};
  };
}

declare const driver: IDriverFile;

${getExportString("driver", options.moduleType)}
`.trim();
}

interface IOptions {
  format: JSONFormat;
  moduleType: ModuleType;
}

export function generateJsDriverTypeFile(options: IOptions) {
  const typeFileString = getTypesString(options);
  fs.writeFileSync(
    path.resolve(consts.TEXT_DIR, "index.d.ts"),
    typeFileString + "\n",
    "utf8"
  );
}
