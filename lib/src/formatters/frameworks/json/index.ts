import I18NextFramework from "./i18next";
import { Output } from "../../../outputs";

export function getFrameworkProcessor(output: Output) {
  if (!output.framework) {
    throw new Error("Only call this function with a framework output");
  }
  let frameworkType = output.framework;
  switch (frameworkType) {
    case "i18next":
      return new I18NextFramework(output);
    default:
      throw new Error(`Unsupported JSON framework: ${frameworkType}`);
  }
}
