import { Output } from "../../../outputs";
import appContext from "../../../utils/appContext";
import OutputFile from "../../shared/fileTypes/OutputFile";

export default class BaseFramework {
  protected output: Output;
  protected outDir: string;

  constructor(output: Output) {
    this.output = output;
    this.outDir = output.outDir ?? appContext.outDir;
  }

  get framework() {
    return this.output.framework;
  }

  process(...args: any[]): OutputFile[] {
    throw new Error("Not implemented");
  }
}
