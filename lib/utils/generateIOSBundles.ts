import path from "path";
import fs from "fs";
import consts from "../consts";
import output from "../output";

interface IArg {
  variants: boolean;
  components?:
    | boolean
    | {
        root?: boolean | { status?: string };
        folders?: string[] | { id: string | null; status?: string }[];
      };
  projects?: string[] | { id: string; status?: string }[];
  localeByVariantId?: Record<string, string>;
}

const IOS_FILE_EXTENSION_PATTERN = /\.(strings|stringsdict)$/;

export async function generateIOSBundles(
  localeByVariantApiId: Record<string, string> | undefined
) {
  const files = fs.readdirSync(consts.TEXT_DIR);

  const bundlesGenerated: {
    [bundleName: string]: {
      mappedVariant?: string;
    };
  } = {};

  for (const fileName of files) {
    if (!IOS_FILE_EXTENSION_PATTERN.test(fileName)) {
      continue;
    }

    const [name, fileExtension] = fileName.split(".");
    if (!name.length) {
      continue;
    }

    const parts = name.split("__");
    const source = parts[0];
    const variant = parts[parts.length - 1];
    if (!(source && variant)) {
      continue;
    }

    const bundleName =
      localeByVariantApiId && localeByVariantApiId[variant]
        ? localeByVariantApiId[variant]
        : variant;
    const bundleFileName = `${bundleName}.lproj`;
    const bundleFolder = path.join(consts.TEXT_DIR, bundleFileName);
    if (!fs.existsSync(bundleFolder)) {
      fs.mkdirSync(bundleFolder);
    }

    const filePathCurrent = path.join(consts.TEXT_DIR, fileName);
    const filePathNew = path.join(bundleFolder, `${source}.${fileExtension}`);

    handleBundleGeneration(source, fileExtension, filePathCurrent, filePathNew);

    bundlesGenerated[bundleFileName] = {
      mappedVariant: variant === bundleName ? undefined : variant,
    };
  }

  return (
    Object.keys(bundlesGenerated)
      .map((bundleName) => {
        let msg = `Successfully generated iOS bundle ${output.info(
          bundleName
        )}`;
        const mappedVariant = bundlesGenerated[bundleName].mappedVariant;
        if (mappedVariant) {
          msg += ` ${output.subtle(`(mapped to variant '${mappedVariant}')`)}`;
        }
        return msg;
      })
      .join("\n") + "\n"
  );
}

function handleBundleGeneration(
  sourceId: string,
  extension: string,
  sourcePath: string,
  newFilePath: string
) {
  if (!fs.existsSync(newFilePath)) {
    return fs.renameSync(sourcePath, newFilePath);
  }

  if (sourceId !== "components") {
    throw new Error("Bundle path for " + sourceId + " already exists");
  }

  if (extension === "strings") {
    return appendStringsFile(sourcePath, newFilePath);
  }

  if (extension === "stringsdict") {
    return appendStringsDictFile(sourcePath, newFilePath);
  }

  throw new Error("Unsupported extension " + extension);
}

function appendStringsFile(sourcePath: string, destPath: string) {
  const sourceContents = fs.readFileSync(sourcePath, "utf-8");
  const newFileContents = fs.readFileSync(destPath, "utf-8");
  fs.writeFileSync(sourcePath, newFileContents + "\n" + sourceContents);
  fs.unlinkSync(sourcePath);
}

function appendStringsDictFile(sourcePath: string, destPath: string) {
  const sourceContentsFull = fs.readFileSync(sourcePath, "utf-8");
  const sourceContentsContent = sourceContentsFull.split("\n").slice(3, -4);

  const newFileContentsFull = fs.readFileSync(destPath, "utf-8");
  const newFileContentsContent = newFileContentsFull.split("\n").slice(3, -4);

  const newContents = `<?xml version="1.0" encoding="utf-8"?>
<plist version="1.0">
    <dict>
${[newFileContentsContent, sourceContentsContent].join("\n")}
    </dict>
</plist>
  `;

  fs.writeFileSync(destPath, newContents);
  fs.unlinkSync(sourcePath);
}
