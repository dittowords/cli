import OutputFile from "./OutputFile";

export default class IOSStringsDictOutputFile<MetadataType> extends OutputFile<
  string,
  MetadataType
> {
  constructor(config: {
    filename: string;
    path: string;
    content?: string;
    metadata?: MetadataType;
  }) {
    super({
      filename: config.filename,
      path: config.path,
      extension: "stringsdict",
      content: config.content ?? "",
      metadata: config.metadata ?? ({} as MetadataType),
    });
  }

  get formattedContent(): string {
    return this.content;
  }
}
