import fs from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { transformFromAst } from "@babel/core";

async function replaceJSXTextInFile(
  filePath: string,
  replacement: { searchString: string; replaceWith: string },
  flags: {
    lineNumbers?: number[];
  }
) {
  const code = await new Promise<string>((r) =>
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        throw err;
      } else {
        r(data);
      }
    })
  );
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  traverse(ast, {
    JSXText(path) {
      const { searchString, replaceWith } = replacement;

      const searchStringEscaped = searchString.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(searchStringEscaped, "gi");
      if (regex.test(path.node.value)) {
        // Ignore if not on a line number that we want to replace.
        if (
          flags.lineNumbers &&
          path.node.loc &&
          !flags.lineNumbers.includes(path.node.loc.start.line)
        ) {
          return;
        }

        const splitValues = splitByCaseInsensitive(
          path.node.value,
          searchStringEscaped
        );
        const nodes: (t.JSXElement | t.JSXText)[] = [];

        splitValues.forEach((splitValue) => {
          if (splitValue.toLowerCase() === searchString.toLowerCase()) {
            const identifier = t.jsxIdentifier("DittoComponent");
            const componentId = t.jsxAttribute(
              t.jsxIdentifier("componentId"),
              t.stringLiteral(replaceWith)
            );
            const o = t.jsxOpeningElement(identifier, [componentId], true);
            const jsxElement = t.jsxElement(o, undefined, [], true);
            nodes.push(jsxElement);
          } else {
            nodes.push(t.jsxText(splitValue));
          }
        });

        path.replaceWithMultiple(nodes);
      }
    },
  });

  // transfromFromAst types are wrong?
  /* @ts-ignore */
  const { code: transformedCode } = transformFromAst(ast, code, {
    // Don't let this codebase's Babel config affect the code we're transforming.
    /* @ts-ignore */
    configFile: false,
  });

  await new Promise((resolve, reject) =>
    fs.writeFile(filePath, transformedCode, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(null);
      }
    })
  );
}

function splitByCaseInsensitive(str: string, delimiter: string) {
  return str.split(new RegExp(`(${delimiter})`, "gi")).filter((s) => s !== "");
}

function replace(options: string[], flags: { lineNumbers?: number[] }) {
  let filePath: string;
  let searchString: string;
  let replaceWith: string;

  try {
    const parsedOptions = parseOptions(options);
    filePath = parsedOptions.filePath;
    searchString = parsedOptions.searchString;
    replaceWith = parsedOptions.replaceWith;
  } catch (e) {
    console.error(e);
    console.error(
      "Usage for replace: ditto-cli replace <file path> <search string> <replace with>"
    );
    return;
  }

  replaceJSXTextInFile(filePath, { searchString, replaceWith }, flags);
}

function parseOptions(options: string[]): {
  filePath: string;
  searchString: string;
  replaceWith: string;
} {
  if (options.length !== 3) {
    throw new Error(
      "The options array must contain <file path> <search string> <replace with>."
    );
  }

  const filePath = options[0];
  // Check if the file path exists and points to a regular file (not a directory or other file system object).
  const isFilePathValid =
    fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();

  if (!isFilePathValid) {
    throw new Error(`${filePath} is not a valid file path.`);
  }

  return { filePath, searchString: options[1], replaceWith: options[2] };
}

export { replace, parseOptions, replaceJSXTextInFile };
