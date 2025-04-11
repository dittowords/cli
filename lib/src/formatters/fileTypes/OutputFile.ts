import { writeFile } from "../../utils/fileSystem";

export default class OutputFile<ContentType = unknown, MetadataType = unknown> {
  filename: string;
  path: string;
  extension: string;
  content: ContentType;
  metadata: MetadataType;

  constructor(
    filename: string,
    path: string,
    extension: string,
    content: ContentType,
    metadata: MetadataType = {} as MetadataType
  ) {
    this.filename = filename;
    this.path = path;
    this.extension = extension;
    this.content = content;
    this.metadata = metadata;
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
