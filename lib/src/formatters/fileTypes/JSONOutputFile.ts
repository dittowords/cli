import OutputFile from "./OutputFile";

export default class JSONOutputFile<MetadataType> extends OutputFile<
  Record<string, unknown>,
  MetadataType
> {
  constructor(
    filename: string,
    path: string,
    content: Record<string, unknown> = {},
    metadata: MetadataType = {} as MetadataType
  ) {
    super(filename, path, "json", content, metadata);
  }

  get formattedContent(): string {
    return JSON.stringify(this.content, null, 2);
  }
}
