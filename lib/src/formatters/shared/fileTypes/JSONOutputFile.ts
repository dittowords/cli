import OutputFile from "./OutputFile";
import { OutputFileSourceKind } from "../baseExport";

/**
 * Metadata for the key/value JSON outputs. `sourceId` is the base or project developer ID the
 * file is named for, and is undefined on the components file.
 */
export type JSONFileMetadata = {
  variantId: string;
  sourceKind: OutputFileSourceKind;
  sourceId?: string;
};

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
