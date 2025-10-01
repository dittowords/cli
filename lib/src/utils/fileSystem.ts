import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

/**
 * Creates a file with the given filename if it doesn't already exist.
 * @param filename The path to the file to create.
 * @param defaultContents The contents to write to the file if it doesn't already exist. Defaults to an empty string.
 * @returns `true` if the file was created, `false` if it already exists.
 */
export function createFileIfMissingSync(
  filename: string,
  defaultContents: string = ""
) {
  const dir = path.dirname(filename);

  // create the directory if it doesn't already exist
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // create the file if it doesn't already exist
  if (!fs.existsSync(filename)) {
    // create the file, writing the `defaultContents` if provided
    writeFileSync(filename, defaultContents);
    return true;
  } else {
    return false;
  }
}

/**
 * Creates a file with the given filename if it doesn't already exist.
 * @param filename The path to the file to create.
 * @param defaultContents The contents to write to the file if it doesn't already exist. Defaults to an empty string.
 * @returns `true` if the file was created, `false` if it already exists.
 */
export async function createFileIfMissing(
  filename: string,
  defaultContents: string = ""
) {
  const dir = path.dirname(filename);

  // create the directory if it doesn't already exist
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // create the file if it doesn't already exist
  if (!fs.existsSync(filename)) {
    // create the file, writing the `defaultContents` if provided
    await writeFile(filename, defaultContents);
    return true;
  } else {
    return false;
  }
}

export function writeFileSync(filename: string, content: string) {
  if (!fs.existsSync(path.dirname(filename))) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  fs.writeFileSync(filename, content, "utf-8");
}

export async function writeFile(filename: string, content: string) {
  if (!fs.existsSync(path.dirname(filename))) {
    await fsPromises.mkdir(path.dirname(filename), { recursive: true });
  }
  await fsPromises.writeFile(filename, content, "utf-8");
}

export const ensureEndsWithNewLine = (str: string) =>
  str + (/[\r\n]$/.test(str) ? "" : "\n");
