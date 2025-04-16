import * as esbuild from "esbuild";

let define = {};

if (process.env.ENV === "production") {
  for (const k in process.env) {
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
