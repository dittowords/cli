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

    /**
     * Converts an array of modules into a string that can be used for a named import or require statement.
     * @param modules array of { name: string, alias?: string }, each named import
     * @returns a string of comma-separated module names/aliases, sorted
     */
    protected formatNamedModules(modules: NamedImport[]) {
      return modules
        .map((m) => {
          if (m.alias) {
            return `${m.name} as ${m.alias}`;
          }
          return m.name;
        })
        .sort()
        .join(", ");
    }

    /**
     * Creates a named import statement for one or more items from a module.
     * Used for i18next type "module".
     * @param modules array of { name: string, alias?: string }, each named import
     * @param moduleName the name of the file or package to import from
     * @returns i.e `import { foo, bar as name } from "./file";`
     */
    protected codegenNamedImport(modules: NamedImport[], moduleName: string) {
      const formattedModules = this.formatNamedModules(modules);

      return `import { ${formattedModules} } from "${moduleName}";\n`;
    }

    /**
     * Creates a named require statement for one or more items from a module.
     * Used for i18next type "commonjs".
     * @param modules array of { name: string, alias?: string }, each named import
     * @param moduleName the name of the file or package to import from
     * @returns i.e `const { foo, bar as name } = require("./file");`
     */
    protected codegenNamedRequire(modules: NamedImport[], moduleName: string) {
      const formattedModules = this.formatNamedModules(modules);

      return `const { ${formattedModules} } = require("${moduleName}");\n`;
    }

    /**
     * Creates a default import statement for i18next type "module".
     * @param module the name of the module to import
     * @param moduleName the name of the file or package to import from
     * @returns i.e codegenDefaultImport("item", "./file") => `import item from "./file";`
     */
    protected codegenDefaultImport(module: string, moduleName: string) {
      return `import ${module} from "${moduleName}";\n`;
    }

    /**
     * Creates a default require statement for i18next type "commonjs".
     * @param module the name of the module to import
     * @param moduleName the name of the file or package to import from
     * @returns i.e codegenDefaultRequire("item", "./file") => `const item = require("./file)";`
     */
    protected codegenDefaultRequire(module: string, moduleName: string) {
      return `const ${module} = require("${moduleName}");\n`;
    }

    /**
     * Creates a default export statement for i18next type "module".
     * @param module the name of the module to export
     * @returns i.e codegenDefaultExport("item") => "export default item;"
     */
    protected codegenDefaultExport(module: string) {
      return `export default ${module};`;
    }

    /**
     * Creates a module exports statement for i18next type "commonjs".
     * @param module the name of the module to export
     * @returns i.e codegenModuleExports("item") => "module.exports = item;"
     */
    protected codegenCommonJSModuleExports(module: string) {
      return `module.exports = ${module};`;
    }

    protected codegenPad(depth: number) {
      return " ".repeat(depth * this.indentSpaces);
    }
  };
}
