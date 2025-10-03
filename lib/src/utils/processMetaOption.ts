/**
 * Processes an array of strings in the format "key:value" and returns an object mapping keys to values.
 * @param inputArr Array of strings in the format "key:value"
 * @returns An object mapping keys to values
 */
const processMetaOption = (inputArr: string[] | null) => {
  const res: Record<string, string> = {};

  if (!Array.isArray(inputArr)) {
    return res;
  }

  inputArr.forEach((element) => {
    const parts = element.split(":");
    if (parts.length > 2) {
      // skip entries with multiple : characters
      // Note: entries with no : will result in key with undefined value, which is ok
      return;
    }
    const [key, value] = parts;
    res[key] = value;
  });

  return res;
};

export default processMetaOption;
