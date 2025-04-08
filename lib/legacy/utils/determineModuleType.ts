import * as fs from "fs";
import * as path from "path";

export type ModuleType = "commonjs" | "module";

/**
 * Looks for a `package.json` file starting in the current working directory and traversing upwards
 * until it finds one or reaches root.
 * @returns "commonjs" or "module", defaulting to "module" if no `package.json` is found or if the found
 * file does not include a `type` property.
 */
export function determineModuleType(currentDir: string | null = process.cwd()) {
  const value = getRawTypeFromPackageJson(currentDir);
  return getTypeOrDefault(value);
}

function getRawTypeFromPackageJson(currentDir: string | null) {
  if (process.env.DITTO_MODULE_TYPE) {
    return process.env.DITTO_MODULE_TYPE;
  }

  while (currentDir) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJsonContents = fs.readFileSync(packageJsonPath, "utf8");
      try {
        const packageData: { type?: string } = JSON.parse(packageJsonContents);
        if (packageData?.type) {
          return packageData.type;
        }
      } catch {}

      return null;
    }

    if (currentDir === "/") {
      break;
    }

    // Move up a directory and continue the search
    currentDir = path.dirname(currentDir);
  }

  // No package.json
  return null;
}

function getTypeOrDefault(value: string | null): ModuleType {
  const valueLower = value?.toLowerCase() || "";
  if (valueLower === "commonjs" || valueLower === "module") {
    return valueLower;
  }

  return "commonjs";
}
