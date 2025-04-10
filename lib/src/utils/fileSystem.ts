import path from "path";
import fs from "fs";

/**
 * Creates a file with t
 * @param filename
 * @param defaultContents
 */
export function createFileIfMissing(filename: string, defaultContents?: any) {
  const dir = path.dirname(filename);

  // create the directory if it doesn't already exist
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // create the file if it doesn't already exist
  if (!fs.existsSync(filename)) {
    // create the file, writing the `defaultContents` if provided
    fs.writeFileSync(filename, defaultContents || "", "utf-8");
  }
}
