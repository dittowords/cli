import { Constructor } from "../shared";

interface NamedImport {
  name: string;
  alias?: string;
}

export default function javascriptCodegenMixin<TBase extends Constructor>(
  Base: TBase
) {
  return class JavascriptCodegenHelpers extends Base {
    protected indentSpaces: number = 2;

    protected sanitizeStringForJSVariableName(str: string) {
      return str.replace(/[^a-zA-Z0-9]/g, "_");
    }

    protected codegenNamedImport(modules: NamedImport[], moduleName: string) {
      const formattedModules = modules
        .map((m) => {
          if (m.alias) {
            return `${m.name} as ${m.alias}`;
          }
          return m.name;
        })
        .sort()
        .join(", ");

      return `import { ${formattedModules} } from "${moduleName}";\n`;
    }

    protected codegenDefaultImport(module: string, moduleName: string) {
      return `import ${module} from "${moduleName}";\n`;
    }

    protected codegenDefaultExport(module: string) {
      return `export default ${module};`;
    }

    protected codegenPad(depth: number) {
      return " ".repeat(depth * this.indentSpaces);
    }
  };
}
