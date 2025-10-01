import {
  CsvColumnMapping,
  importComponents as importComponentsHttp,
} from "./http/importComponents";

async function importComponents(
  filePath: string,
  options: {
    csvColumnMapping?: CsvColumnMapping;
  }
) {
  if (
    filePath.endsWith(".csv") &&
    (!options.csvColumnMapping?.name || !options.csvColumnMapping?.text)
  ) {
    throw new Error(
      ".csv files require the --component-name and --text flags."
    );
  }
  const importResult = await importComponentsHttp(filePath, options);
  console.log(JSON.stringify(importResult));
}

export { importComponents };
