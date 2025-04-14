import { ensureEndsWithNewLine } from "../../../utils/fileSystem";
import OutputFile from "./OutputFile";

export default class JavascriptOutputFile<MetadataType> extends OutputFile<
  string,
  MetadataType
> {
  indentSpaces: number = 2;

  constructor(
    filename: string,
    path: string,
    content: string = "",
    metadata: MetadataType = {} as MetadataType
  ) {
    super(filename, path, "js", content, metadata);
  }

  get formattedContent(): string {
    return ensureEndsWithNewLine(this.content ?? "");
  }
}
