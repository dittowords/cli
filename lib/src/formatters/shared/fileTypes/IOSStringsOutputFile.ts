import OutputFile from "./OutputFile";

// BP: Is this MetadataType necessary?
export default class IOSStringsOutputFile<MetadataType> extends OutputFile<
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
      extension: "strings",
      content: config.content ?? "",
      metadata: config.metadata ?? ({} as MetadataType),
    });
  }

  get formattedContent(): string {
    return this.content;
  }
}
