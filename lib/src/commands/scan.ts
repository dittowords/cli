import "dotenv/config";
import fs from "fs/promises";
import path from "path";

import logger from "../utils/logger";
import { quit } from "../utils/quit";
import { DittoScanExtractSummary, runExtract } from "../scan/extract";
import { DittoScanCandidate, DittoScanResult } from "../scan/types";
import { preClassify } from "../scan/preClassify";
import { DittoScanClassifyResult, runClassify } from "../scan/classify";

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
    results: path.join(outDir, `${p}results.ndjson`),
    summary: path.join(outDir, `${p}summary.json`),
    verify: path.join(outDir, `${p}resultsToVerify.ndjson`),
    analysis: path.join(outDir, `${p}analysis.json`),
    schema: path.join(outDir, `${p}schema.json`),
    stagings: path.join(outDir, `${p}stagings.ndjson`),
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
  outputPath: string
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
      `[ditto-cli scan][extract] llm file discovery (${d.task}): ${
        d.llmConfirmed + d.autoIncluded
      }/${d.totalCandidates} files matched in ${d.elapsedMs}ms (preFiltered=${
        d.preFiltered
      }, autoIncluded=${d.autoIncluded}, llmConsidered=${
        d.llmConsidered
      }, llmConfirmed=${d.llmConfirmed}, tokensIn=${
        d.promptTokens
      }, tokensOut=${d.completionTokens}, calls=${d.llmCalls})\n`
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
  process.stderr.write(
    `[ditto-cli scan][extract] emitted ${summary.candidatesEmitted} candidates -> ${outputPath}\n`
  );
  for (const [kind, count] of Object.entries(summary.candidatesByKind)) {
    if (count > 0) process.stderr.write(`  candidates.${kind}: ${count}\n`);
  }
  const { accept, reject, llm } = summary.candidatesByVerdict;
  if (accept > 0 || reject > 0 || llm > 0) {
    process.stderr.write(
      `[ditto-cli scan][extract] rule verdicts: accept=${accept}, reject=${reject}, llm=${llm}\n`
    );
    for (const [name, count] of Object.entries(summary.ruleHits)) {
      process.stderr.write(`  rule.${name}: ${count}\n`);
    }
  }
}

// Telemetry for the classify phase — per-status counts, LLM call/token
// totals, and the paths to the results and summary artifacts.
function logClassifySummary(
  result: DittoScanClassifyResult,
  summaryPath: string
): void {
  process.stderr.write(
    `[ditto-cli scan][classify] classified ${result.summary.candidate_total} candidates\n`
  );
  for (const [status, count] of Object.entries(result.summary.by_status)) {
    process.stderr.write(`  ${status}: ${count}\n`);
  }
  process.stderr.write(
    `[ditto-cli scan][classify] llm_calls: ${result.summary.llm_calls}, tokens_in: ${result.summary.llm_tokens_in}, tokens_out: ${result.summary.llm_tokens_out}\n`
  );
  process.stderr.write(
    `[ditto-cli scan][classify] to_manually_validate: ${result.summary.num_results_to_manually_verify}\n`
  );
  process.stderr.write(
    `[ditto-cli scan][classify] pct_results_needing_manual_verification: ${result.summary.pct_results_needing_manual_verification}\n`
  );
  for (const [status, filePath] of Object.entries(
    result.writtenPaths.resultsByStatus
  )) {
    process.stderr.write(`[ptd classify] results.${status} -> ${filePath}\n`);
  }
  process.stderr.write(`[ptd classify] summary  -> ${summaryPath}\n`);
  if (result.writtenPaths.verify) {
    process.stderr.write(
      `[ditto-cli scan][classify] verify   -> ${result.writtenPaths.verify}\n`
    );
  }
}

export const scan = async (
  path: string,
  outDir: string = "./out",
  prefix: string = ""
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return await quit(
      logger.errorText("GEMINI_API_KEY is not set. Aborting."),
      2
    );
  }

  const resolvedInput = resolveUserPath(path);
  const resolvedOutDir = resolveUserPath(outDir);
  await fs.mkdir(resolvedOutDir, { recursive: true });

  const {
    candidates: candidatesPath,
    results: resultsPath,
    summary: summaryPath,
    verify: verifyPath,
    schema: schemaPath,
    stagings: stagingsPath,
  } = buildOutputPaths(resolvedOutDir, prefix);

  const {
    candidates,
    verdicts,
    summary: extractSummary,
  } = await runExtract({ inputPath: resolvedInput });
  await writeCandidatesNdjson(candidates, candidatesPath);
  logExtractSummary(extractSummary, candidatesPath);

  if (candidates.length === 0) {
    logger.warnText(
      `[ditto scan] no candidates extracted; writing empty classify output\n`
    );
  }

  const { llmCandidates, preClassified } = preClassify(candidates, verdicts);

  const classifyResult = await runClassify({
    candidates: llmCandidates,
    preClassified,
    outputPath: resultsPath,
    summaryPath,
    verifyPath,
  });
  logClassifySummary(classifyResult, summaryPath);
};
