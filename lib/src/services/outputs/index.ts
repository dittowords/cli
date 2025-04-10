import { TextItemsResponse } from "../../http/pull";
import { ProjectConfigYAML } from "../projectConfig";
import { createFileIfMissing, writeFile } from "../../utils/fileSystem";

export class Formatter {
  protected output: ProjectConfigYAML["outputs"][number];

  constructor(output: ProjectConfigYAML["outputs"][number]) {
    this.output = output;
  }

  format(textItems: TextItemsResponse) {
    throw new Error("Not implemented");
  }

  async writeFile(path: string, content: string) {
    const result = await createFileIfMissing(path, content);
    if (result) {
      return;
    }

    await writeFile(path, content);
    return;
  }
}
