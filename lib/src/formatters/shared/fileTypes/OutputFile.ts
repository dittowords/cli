export default class OutputFile<ContentType = unknown, MetadataType = unknown> {
  filename: string;
  path: string;
  extension: string;
  content: ContentType;
  metadata: MetadataType;

  constructor(config: {
    filename: string;
    path: string;
    extension: string;
    content: ContentType;
    metadata?: MetadataType;
  }) {
    this.filename = config.filename;
    this.path = config.path;
    this.extension = config.extension;
    this.content = config.content;
    this.metadata = config.metadata ?? ({} as MetadataType);
  }

  get fullPath() {
    return `${this.path}/${this.filename}.${this.extension}`;
  }

  get filenameWithExtension() {
    return `${this.filename}.${this.extension}`;
  }

  get formattedContent(): string {
    throw new Error("Not implemented");
  }
}
