import { CommandMetaFlags } from "../http/types";

/**
 * Processes an array of strings in the format "key:value" and returns an object mapping keys to values.
 * @param inputArr Array of strings in the format "key:value"
 * @returns An object mapping keys to values
 */
const processCommandMetaFlag = (
  inputArr: string[] | null
): CommandMetaFlags => {
  const res: CommandMetaFlags = {};

  if (!Array.isArray(inputArr)) {
    return res;
  }

  inputArr.forEach((element) => {
    const parts = element.split(":");
    // Skip entries with multiple ":" characters
    // Entries with no ":" will result in key with undefined value, which is ok
    if (parts.length > 2) {
      return;
    }
    const [key, value] = parts;
    res[key] = value;
  });

  return res;
};

export default processCommandMetaFlag;
