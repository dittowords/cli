import fs from "fs-extra";
import glob from "glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

import {
  FetchComponentResponse,
  FetchComponentResponseComponent,
  fetchComponents,
} from "./http/fetchComponents";

interface Occurrence {
  lineNumber: number;
  preview: string;
}

interface Result extends FetchComponentResponseComponent {
  apiId: string;
  occurrences: {
    [file: string]: Occurrence[];
  };
}

async function generateSuggestions(flags: {
  directory?: string;
  files?: string[];
  componentFolder?: string;
}) {
  const components = await fetchComponents({
    ...(flags.componentFolder
      ? { componentFolder: flags.componentFolder }
      : {}),
  });
  const directory = flags.directory || ".";

  const results: { [apiId: string]: Result } = await findComponentsInJSXFiles({
    directory,
    files: flags.files,
    components,
  });

  // Display results to user
  console.log(JSON.stringify(results, null, 2));
}

async function findComponentsInJSXFiles(params: {
  directory: string;
  files?: string[];
  components: FetchComponentResponse;
}): Promise<{ [apiId: string]: Result }> {
  const result: { [apiId: string]: Result } = {};
  const files =
    params.files ||
    glob.sync(`${params.directory}/**/*.+(jsx|tsx)`, {
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

        traverse(ast, {
          JSXText(path) {
            for (const [compApiId, component] of Object.entries(
              params.components,
            )) {
              // If we haven't seen this component before, add it to the result
              if (!result[compApiId]) {
                result[compApiId] = {
                  apiId: compApiId,
                  ...component,
                  occurrences: {},
                };
              }

              if (
                // Skip white space lines
                !/^\s*$/.test(path.node.value) &&
                !/^\s*$/.test(component.text) &&
                path.node.value.includes(component.text)
              ) {
                // Escape all special characters from the text so we can use it in a regex
                const escapedText = component.text.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&",
                );
                const regex = new RegExp(escapedText, "g");
                let match;
                while ((match = regex.exec(path.node.value)) !== null) {
                  const lines = path.node.value
                    .slice(0, match.index)
                    .split("\n");

                  if (!path.node.loc) {
                    continue;
                  }

                  const lineNumber =
                    path.node.loc.start.line + lines.length - 1;

                  const codeLines = code.split("\n");
                  const line = codeLines[lineNumber - 1];
                  const preview = replaceAt(
                    line,
                    match.index,
                    component.text,
                    `${component.text}`,
                  );

                  // Initialize the occurrences array if it doesn't exist
                  if (!result[compApiId]["occurrences"][file]) {
                    result[compApiId]["occurrences"][file] = [];
                  }

                  result[compApiId]["occurrences"][file].push({
                    lineNumber,
                    preview,
                  });
                }
              }

              // Remove from result if no occurrences were found
              if (Object.keys(result[compApiId]["occurrences"]).length === 0) {
                delete result[compApiId];
              }
            }
          },
        });
      }),
    );
  }

  await Promise.all(promises);

  return result;
}

function replaceAt(
  str: string,
  index: number,
  searchString: string,
  replacement: string,
) {
  return (
    str.substring(0, index) +
    str.substring(index, str.length).replace(searchString, replacement)
  );
}

export { findComponentsInJSXFiles, generateSuggestions };
