import { Output } from "../../../outputs";
import JsonDriverFramework from "./driver";

export function getFrameworkProcessor(output: Output) {
  if (!output.framework) {
    throw new Error("Only call this function with a framework output");
  }
  let frameworkType = output.framework;
  switch (frameworkType) {
    case "i18next":
    case "vue-i18n":
      return new JsonDriverFramework(output);
    default:
      throw new Error(`Unsupported JSON framework: ${frameworkType}`);
  }
}
