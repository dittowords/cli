import OutputFile from "./OutputFile";

/**
 * Metadata for the key/value JSON outputs. `projectId` is set on project files and left
 * undefined on the components file.
 */
export type JSONFileMetadata = { variantId: string; projectId?: string };

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
