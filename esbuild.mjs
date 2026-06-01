import * as esbuild from "esbuild";
import { execSync } from "child_process";

let define = {};
const KEYS_TO_DEFINE = [
  "ENV",
  "SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_DSN",
];

if (process.env.ENV === "production") {
  for (const k of KEYS_TO_DEFINE) {
    define[`process.env.${k}`] = JSON.stringify(process.env[k]);
  }
}

/**
 * @type {esbuild.BuildOptions}
 */
const config = {
  entryPoints: ["lib/ditto.ts"],
  bundle: true,
  metafile: true,
  keepNames: true,
  tsconfig: "tsconfig.json",
  sourcemap: process.env.ENV === "production" ? "external" : "both",
  minify: process.env.ENV === "production",
  outdir: "bin",
  target: "es2020",
  packages: "external",
  platform: "node",
  define,
};

async function main() {
  const result = await esbuild.build(config);
  execSync("tsc -p tsconfig.declarations.json --emitDeclarationOnly", { stdio: "inherit" });
  // Output build metafile so we can analyze the bundle
  // size over time and check if anything unexpected is being bundled in.
  if (process.env.ENV === "production") {
    console.log(
      await esbuild.analyzeMetafile(result.metafile, {
        verbose: true,
      })
    );
  }
}

main();
