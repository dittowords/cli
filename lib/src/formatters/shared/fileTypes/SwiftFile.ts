import OutputFile from "./OutputFile";

export default class SwiftOutputFile extends OutputFile<string, {}> {
  constructor(config: { filename: string; path: string; content?: string }) {
    super({
      filename: config.filename,
      path: config.path,
      extension: "swift",
      content: config.content ?? "",
    });
  }

  get formattedContent(): string {
    return this.content;
  }
}
