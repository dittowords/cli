import OutputFile from "../shared/fileTypes/OutputFile";

export default class BaseFramework {
  protected format: string;

  constructor(format: string) {
    this.format = format;
  }

  process(...args: any[]): OutputFile[] {
    throw new Error("Not implemented");
  }
}
