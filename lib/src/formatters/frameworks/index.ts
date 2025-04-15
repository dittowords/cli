import I18NextFramework from "./i18next";

export function getFrameworkProcessor(framework: string) {
  switch (framework) {
    case "i18next":
      return new I18NextFramework(framework);
    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}
