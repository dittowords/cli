import { ensureEndsWithNewLine } from "../../../utils/fileSystem";
import OutputFile from "./OutputFile";

export default class JavascriptOutputFile<MetadataType> extends OutputFile<
  string,
  MetadataType
> {
  indentSpaces: number = 2;

  constructor(config: {
    filename: string;
    path: string;
    content?: string;
    metadata?: MetadataType;
  }) {
    super({
      filename: config.filename,
      path: config.path,
      extension: "js",
      content: config.content ?? "",
      metadata: config.metadata ?? ({} as MetadataType),
    });
  }

  get formattedContent(): string {
    return ensureEndsWithNewLine(this.content ?? "");
  }
}
