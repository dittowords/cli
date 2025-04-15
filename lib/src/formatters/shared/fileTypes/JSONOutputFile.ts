import OutputFile from "./OutputFile";

export default class JSONOutputFile<MetadataType> extends OutputFile<
  Record<string, unknown>,
  MetadataType
> {
  constructor(config: {
    filename: string;
    path: string;
    content?: Record<string, unknown>;
    metadata?: MetadataType;
  }) {
    super({
      filename: config.filename,
      path: config.path,
      extension: "json",
      content: config.content ?? {},
      metadata: config.metadata ?? ({} as MetadataType),
    });
  }

  get formattedContent(): string {
    return JSON.stringify(this.content, null, 2);
  }
}
