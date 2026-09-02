import fs from "fs/promises";
import path from "path";

import { prompt } from "enquirer";
import open from "open";

import {
  DittoScanCandidate,
  DittoScanExtractSummary,
  runExtract,
} from "@dittowords/text-extract";
import chalk from "chalk";
import {
  asScanLimitInfo,
  getLastScannedCommit,
  initiateClassify,
  initiateScan,
  MAX_SCAN_RENAMES,
  scanLimitError,
  uploadCandidatesToS3,
} from "../http/scan";
import {
  analyzeDirectories,
  formatDirectoryBreakdown,
  formatOverLimitMessage,
} from "../scan/analyzeDirectories";
import {
  GitContext,
  GitRename,
  readGitContext,
  readRenames,
} from "../scan/git";
import initAPIToken from "../services/apiToken/initAPIToken";
import appContext from "../utils/appContext";
import DittoError, { ErrorType } from "../utils/DittoError";
import logger from "../utils/logger";
import { quit } from "../utils/quit";

// Yarn sets INIT_CWD to the directory the user invoked yarn from, which
// matters when we proxy via `cd product-text-detection && yarn ptd`.
function resolveUserPath(input: string): string {
  if (path.isAbsolute(input)) return input;
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), input);
}

// Builds the standard output file paths for a given directory and optional
// prefix. Files are named "{prefix}-{artifact}.ext" when a prefix is given,
// or just "{artifact}.ext" when omitted.
function buildOutputPaths(outDir: string, prefix?: string) {
  const p = prefix ? `${prefix}-` : "";
  return {
    candidates: path.join(outDir, `${p}candidates.ndjson`),
  };
}

// Serialize extracted candidates as newline-delimited JSON. Used by both the
// standalone `extract` command and `run`, which keeps the same artifact on disk.
async function writeCandidatesNdjson(
  candidates: DittoScanCandidate[],
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  const ndjson =
    candidates.map((c) => JSON.stringify(c)).join("\n") +
    (candidates.length > 0 ? "\n" : "");
  await fs.writeFile(outputPath, ndjson, "utf8");
}

// Telemetry for the extract phase — framework detection, file counts,
// per-detection-kind candidate counts, and the output path.
function logExtractSummary(
  summary: DittoScanExtractSummary,
  outputPath?: string
): void {
  process.stderr.write(
    `[ditto-cli scan][extract] framework: ${
      summary.framework.length > 0
        ? summary.framework.join(", ")
        : "(none detected)"
    }\n`
  );
  process.stderr.write(
    `[ditto-cli scan][extract] scanned ${summary.filesScanned} files in ${summary.elapsedMs}ms\n`
  );
  if (summary.i18nFileDiscovery) {
    const d = summary.i18nFileDiscovery;
    process.stderr.write(
      `[ditto-cli scan][extract] i18n file discovery (${d.task}): ${
        d.heuristicConfirmed + d.autoIncluded
      }/${d.totalCandidates} files matched in ${d.elapsedMs}ms (preFiltered=${
        d.preFiltered
      }, autoIncluded=${d.autoIncluded}, heuristicConsidered=${
        d.heuristicConsidered
      }, heuristicConfirmed=${d.heuristicConfirmed})\n`
    );
  }
  for (const [kind, count] of Object.entries(summary.filesByKind)) {
    process.stderr.write(`  files.${kind}: ${count}\n`);
  }
  if (summary.filesSkippedMinified > 0) {
    process.stderr.write(
      `  files.skipped_minified: ${summary.filesSkippedMinified}\n`
    );
  }
  // A failed file is dropped from the results, so its strings are missing.
  if (summary.filesFailed > 0) {
    process.stderr.write(`  files.failed: ${summary.filesFailed}\n`);
    for (const f of summary.failures) {
      process.stderr.write(`    ${f.file} (${f.language}): ${f.message}\n`);
    }
  }
  process.stderr.write(
    `[ditto-cli scan][extract] emitted ${
      summary.candidatesEmitted
    } candidates -> ${outputPath ?? "Ditto"}\n`
  );
  for (const [kind, count] of Object.entries(summary.candidatesByKind)) {
    if (count > 0) process.stderr.write(`  candidates.${kind}: ${count}\n`);
  }
}

function buildOverLimitError(args: {
  candidates: DittoScanCandidate[];
  originalPath: string;
  limit: number;
  plan?: string;
}): DittoError<ErrorType.ScanError> {
  const analysis = analyzeDirectories(
    args.candidates.map((c) => c.location.file),
    args.limit
  );
  return new DittoError({
    type: ErrorType.ScanError,
    message: formatOverLimitMessage(analysis, {
      plan: args.plan,
      originalPath: args.originalPath,
    }),
    exitCode: 1,
    expected: true,
    data: {
      rawErrorMessage: `scan candidate limit exceeded (${analysis.total} > ${args.limit})`,
    },
  });
}

interface ISyncOptions {
  local: boolean;
  outDir?: string;
  prefix?: string;
  listDirectories?: boolean;
}
export const scan = async (
  path: string,
  { local, outDir = "", prefix = "", listDirectories = false }: ISyncOptions
) => {
  if (local && !outDir && !listDirectories) {
    return await quit(
      logger.errorText(
        "Must specify --out-dir if outputting candidates locally"
      ),
      2
    );
  }

  const resolvedInput = resolveUserPath(path);

  const { candidates, summary: extractSummary } = await runExtract({
    inputPath: resolvedInput,
  });

  if (candidates.length === 0) {
    logger.writeLine(
      logger.warnText(
        `[ditto scan] no candidates extracted; writing empty classify output\n`
      )
    );
  }

  if (listDirectories) {
    logger.writeLine(
      formatDirectoryBreakdown(
        candidates.map((c) => c.location.file),
        path
      )
    );
    return await quit(null, 0);
  }

  if (local) {
    const resolvedOutDir = resolveUserPath(outDir);
    await fs.mkdir(resolvedOutDir, { recursive: true });

    const { candidates: candidatesPath } = buildOutputPaths(
      resolvedOutDir,
      prefix
    );

    await writeCandidatesNdjson(candidates, candidatesPath);
    logExtractSummary(extractSummary, candidatesPath);
  } else {
    const gitContext = await readGitContext(resolvedInput);
    if (!gitContext) {
      logger.writeLine(
        logger.warnText(
          "[ditto scan] not a git repository - this scan can be imported but not re-synced\n"
        )
      );
    } else if (gitContext.dirty) {
      logger.writeLine(
        logger.warnText(
          `[ditto scan] uncommitted changes present; recording ${gitContext.commitSha.slice(
            0,
            7
          )} as an approximate commit\n`
        )
      );
    }

    const token = await initAPIToken();
    appContext.setAuthToken(token);
    const renamesSinceLastScan = await readRenamesSinceLastScan(gitContext);

    const {
      candidatesSignedS3Url,
      record: { _id: recordId },
      planLimit,
    } = await initiateScan(resolvedInput, gitContext, renamesSinceLastScan);

    // Fail before the wasted upload when the candidates we already extracted exceed it.
    if (
      planLimit &&
      candidates.length > planLimit.candidateLimit - planLimit.candidatesUsed
    ) {
      throw buildOverLimitError({
        candidates,
        originalPath: path,
        limit: planLimit.candidateLimit - planLimit.candidatesUsed,
        plan: planLimit.plan,
      });
    }

    await uploadCandidatesToS3(candidates, candidatesSignedS3Url);
    try {
      await initiateClassify(recordId);
    } catch (e) {
      // Turn the classify step's plan-limit response into concrete
      // subdirectory suggestions built from the candidates in memory.
      const info = asScanLimitInfo(e);
      if (info) {
        if (info.limit != null) {
          throw buildOverLimitError({
            candidates,
            originalPath: path,
            limit: info.limit - (info.used ?? 0),
            plan: info.plan,
          });
        }
        throw scanLimitError(
          info.message ?? "This scan exceeds your plan's limit."
        );
      }
      throw e;
    }
    logExtractSummary(extractSummary);
    const url = `${appContext.appHost}/scan/${recordId}`;
    console.log(
      `Scan initiated! Visit ${chalk.blueBright.underline(
        url
      )} to view progress and see results.`
    );
    const { openUrl } = await prompt<{ openUrl: boolean }>({
      type: "confirm",
      name: "openUrl",
      message: "Open in browser?",
      initial: true,
    });
    if (openUrl) await open(url);
    await quit(null, 0);
  }
};

/**
 * What git says moved between the last scan of this repo and HEAD, so a renamed/moved file
 * keeps its links instead of reading as a delete plus a create. Empty when there is
 * no git context, no earlier scan, or no way to reach the earlier commit.
 */
async function readRenamesSinceLastScan(
  gitContext: GitContext | null
): Promise<GitRename[]> {
  if (!gitContext) return [];

  const lastScannedCommit = await getLastScannedCommit(gitContext.repoKey);
  if (!lastScannedCommit) return [];

  const renames = await readRenames(gitContext.repoRoot, lastScannedCommit);
  if (renames.length > MAX_SCAN_RENAMES) {
    logger.writeLine(
      logger.warnText(
        `[ditto scan] ${renames.length} files moved since the last scan; keeping the history of the first ${MAX_SCAN_RENAMES}\n`
      )
    );
  }
  return renames;
}
