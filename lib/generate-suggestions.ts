import fs from "fs-extra";
import glob from "glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

import {
  FetchComponentResponseComponent,
  fetchComponents,
} from "./http/fetchComponents";

async function generateSuggestions(flags: { directory?: string }) {
  const components = await fetchComponents();
  const results: {
    [compApiId: string]: FindResults;
  } = {};

  for (const [compApiId, component] of Object.entries(components)) {
    if (!results[compApiId]) {
      results[compApiId] = [];
    }

    const directory = flags.directory || ".";
    const result = await findTextInJSXFiles(directory, component);
    results[compApiId] = [...results[compApiId], ...result];

    // Remove if there the length is zero
    if (results[compApiId].length === 0) {
      delete results[compApiId];
    }
  }

  // Display results to user
  console.log(JSON.stringify(results, null, 2));
}

interface Occurence {
  lineNumber: number;
  preview: string;
}

type FindResults = {
  file: string;
  name: string;
  text: string;
  status: "NONE" | "WIP" | "REVIEW" | "FINAL";
  folder: "string" | null;
  occurrences: Occurence[];
}[];

async function findTextInJSXFiles(
  path: string,
  component: FetchComponentResponseComponent
): Promise<FindResults> {
  const result: FindResults = [];
  const files = glob.sync(`${path}/**/*.+(jsx|tsx)`, {
    ignore: "**/node_modules/**",
  });

  const promises: Promise<any>[] = [];

  for (const file of files) {
    promises.push(
      fs.readFile(file, "utf-8").then((code) => {
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        const occurrences: Occurence[] = [];

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
          result.push({ file, occurrences, ...component });
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
