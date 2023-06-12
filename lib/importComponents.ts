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
  const importResult = await importComponentsHttp(filePath, options);
  console.log(JSON.stringify(importResult));
}

export { importComponents };
