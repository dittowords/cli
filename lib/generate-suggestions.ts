import fs from "fs-extra";
import glob from "glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

import {
  FetchComponentResponseComponent,
  fetchComponents,
} from "./http/fetchComponents";

interface Result extends FetchComponentResponseComponent {
  apiId: string;
  occurrences: {
    [file: string]: Occurrence[];
  };
}

interface Occurrence {
  lineNumber: number;
  preview: string;
}

async function generateSuggestions(flags: { directory?: string }) {
  const components = await fetchComponents();
  const results: { [apiId: string]: Result } = {};

  for (const [compApiId, component] of Object.entries(components)) {
    if (!results[compApiId]) {
      results[compApiId] = { apiId: compApiId, ...component, occurrences: {} };
    }

    const directory = flags.directory || ".";
    const result = await findTextInJSXFiles(directory, component);
    results[compApiId].occurrences = result;

    // Remove if there the length is zero
    if (Object.keys(results[compApiId].occurrences).length === 0) {
      delete results[compApiId];
    }
  }

  // Display results to user
  console.log(JSON.stringify(results, null, 2));
}

async function findTextInJSXFiles(
  path: string,
  component: FetchComponentResponseComponent
) {
  const result: Result["occurrences"] = {};
  const files = glob.sync(`${path}/**/*.+(jsx|tsx)`, {
    ignore: "**/node_modules/**",
  });

  const promises: Promise<any>[] = [];

  for (const file of files) {
    result[file] = [];

    promises.push(
      fs.readFile(file, "utf-8").then((code) => {
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        const occurrences: Occurrence[] = [];

        traverse(ast, {
          JSXText(path) {
            if (path.node.value.includes(component.text)) {
              const regex = new RegExp(component.text, "g");
              let match;
              while ((match = regex.exec(path.node.value)) !== null) {
                const lines = path.node.value.slice(0, match.index).split("\n");

                if (!path.node.loc) {
                  continue;
                }

                const lineNumber = path.node.loc.start.line + lines.length - 1;

                const codeLines = code.split("\n");
                const line = codeLines[lineNumber - 1];
                const preview = replaceAt(
                  line,
                  match.index,
                  component.text,
                  `${component.text}`
                );

                occurrences.push({ lineNumber, preview });
              }
            }
          },
        });

        if (occurrences.length > 0) {
          result[file] = occurrences;
        } else {
          delete result[file];
        }
      })
    );
  }

  await Promise.all(promises);

  return result;
}

function replaceAt(
  str: string,
  index: number,
  searchString: string,
  replacement: string
) {
  return (
    str.substring(0, index) +
    str.substring(index, str.length).replace(searchString, replacement)
  );
}

export { findTextInJSXFiles, generateSuggestions };
