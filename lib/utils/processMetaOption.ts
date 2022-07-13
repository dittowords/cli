const processMetaOption = (inputArr: string[] | null) => {
  const res: Record<string, string> = {};

  if (!Array.isArray(inputArr)) {
    return res;
  }

  inputArr.forEach((element) => {
    const [key, value] = element.split(":");
    res[key] = value;
  });

  return res;
};

export default processMetaOption;
