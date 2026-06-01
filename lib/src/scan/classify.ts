import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

import { callGemini } from "../services/gemini";

import {
  DittoScanCandidate,
  DittoScanStatusSchema,
  type DittoScanResult,
  type DittoScanStatus,
  type DittoScanSummary,
} from "./types";
import DittoError, { ErrorType } from "../utils/DittoError";

export interface DittoScanClassifyOptions {
  candidates?: DittoScanCandidate[];
  // Results already decided by the deterministic rule classifier in
  // `pre-classify`. Merged into the output file ahead of LLM-decided
  // results. Their `decided_by` is "rule".
  preClassified?: DittoScanResult[];
  inputPath?: string;
  outputPath: string;
  summaryPath: string;
  verifyPath: string;
}

interface DittoScanClassifyData {
  results: DittoScanResult[];
  summary: DittoScanSummary;
}

export interface DittoScanClassifyResult extends DittoScanClassifyData {
  writtenPaths: {
    resultsByStatus: Partial<Record<DittoScanStatus, string>>;
    verify: string | null;
  };
}

const MIN_CONFIDENCE_LEVEL = 0.9;
const BATCH_SIZE = 10;
const PARALLEL_BATCHES = 5;
const CLASSIFY_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are classifying string literals extracted from an application codebase to determine whether they are user-facing (visible to end users in the UI) or not. The application type (web, mobile, desktop, etc.) can be inferred from the framework field on each candidate.

For each candidate examine:
- value_raw: the actual string literal
- detection_kind: markup_text (JSX/HTML text content), markup_attr (HTML attribute value), resource_value (value inside a localization resource file), or other (any other code position)
- context_identifiers: attribute names or identifiers enclosing the string (e.g. "placeholder", "aria-label", "classname", "textid"); for resource_value this is the localization key and any variant labels (e.g. ["greeting"] or ["items", "one"])
- language: the file's language (tsx, jsx, typescript, javascript, vue, kotlin, swift, ios_strings, android_resources, etc.) — helps interpret the source_context syntax
- framework: UI frameworks and platforms detected in the project (e.g. ["react"], ["vue"], ["android"], ["ios"]) — a React/Vue/iOS/Android file is far more likely to contain user-facing strings than a plain Node.js utility
- source_context: surrounding lines of source code with line numbers
- usage_evidence (if present): how the string constant is used elsewhere in the codebase

Classification statuses:
- "user-facing": text visible to end users — button labels, form placeholders, error messages shown in the UI, modal titles, headings, aria-labels, tooltip text, etc.
- "not-user-facing": internal strings — CSS class names, import paths, localStorage keys, API route prefixes, internal error codes used for programmatic comparisons, keyboard key names for event matching (e.g. "Enter"), enum-like string values, Ditto textId references (e.g. "text_630d31..."), etc.
- "unsure": genuinely ambiguous; use sparingly

Use confidence >= ${MIN_CONFIDENCE_LEVEL} when evidence clearly points one way, 0.6 - ${MIN_CONFIDENCE_LEVEL} when leaning one way with some ambiguity, < 0.6 for truly unclear cases.
Set info_needed to null unless specific missing context would meaningfully change the verdict.`;

const ZBatchItem = z.object({
  id: z.string(),
  status: DittoScanStatusSchema,
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  info_needed: z.string().nullable(),
});

const ZBatchResponse = z.object({
  items: z.array(ZBatchItem),
});

interface Stats {
  llmCalls: number;
  tokensIn: number;
  tokensOut: number;
}

function formatCandidate(c: DittoScanCandidate, index: number): string {
  const parts = [
    `[Candidate ${index + 1}]`,
    `id: ${JSON.stringify(c.id)}`,
    `value_raw: ${JSON.stringify(c.value_raw)}`,
    `detection_kind: ${c.detection_kind}`,
    `context_identifiers: [${c.context_identifiers
      .map((x) => JSON.stringify(x))
      .join(", ")}]`,
    `language: ${c.language}`,
    `framework: [${c.framework.map((f) => JSON.stringify(f)).join(", ")}]`,
    `source_context:\n${c.source_context}`,
  ];
  if (c.usage_evidence?.length) {
    parts.push(
      `usage_evidence:\n${c.usage_evidence
        .map((e) => `  ${e.file}:${e.line}: ${e.excerpt}`)
        .join("\n")}`
    );
  }
  parts.push(`[/Candidate ${index + 1}]`);
  return parts.join("\n");
}

async function classifyBatch(
  batch: DittoScanCandidate[],
  stats: Stats
): Promise<z.infer<typeof ZBatchItem>[] | null> {
  const userPrompt = [
    `Classify the following ${batch.length} string literal candidates.`,
    `Return a JSON object with an "items" array containing one classification per candidate, in the same order.`,
    "",
    batch.map((c, i) => formatCandidate(c, i)).join("\n\n"),
  ].join("\n");

  try {
    const result = await callGemini(userPrompt, ZBatchResponse, SYSTEM_PROMPT);

    if (!result) return null;

    stats.llmCalls++;
    stats.tokensIn +=
      result.metadata.geminiUsageMetadata?.promptTokenCount ?? 0;
    stats.tokensOut +=
      result.metadata.geminiUsageMetadata?.candidatesTokenCount ?? 0;

    if (result.data.items.length !== batch.length) {
      process.stderr.write(
        `[classify] response had ${result.data.items.length} items for ${batch.length} candidates\n`
      );
      return null;
    }
    return result.data.items;
  } catch (e: any) {
    process.stderr.write(
      `[classify/gemini] error: ${e.message ?? String(e)}\n`
    );
    return null;
  }
}

async function classifyWithRecovery(
  batch: DittoScanCandidate[],
  stats: Stats
): Promise<DittoScanResult[]> {
  let items = await classifyBatch(batch, stats);

  if (!items) {
    process.stderr.write(`[classify] retrying batch of ${batch.length}...\n`);
    items = await classifyBatch(batch, stats);
  }

  if (items) {
    const byId = new Map(items.map((item) => [item.id, item]));
    return batch.flatMap((c) => {
      const item = byId.get(c.id);
      if (!item) return [];
      return [
        {
          ...c,
          status: item.status,
          reason: item.reason,
          confidence: item.confidence,
          info_needed: item.info_needed,
          decided_by: "llm" as const,
        },
      ];
    });
  }

  if (batch.length > 1) {
    process.stderr.write(
      `[classify] splitting batch of ${batch.length} after failure\n`
    );
    const mid = Math.ceil(batch.length / 2);
    const left = await classifyWithRecovery(batch.slice(0, mid), stats);
    const right = await classifyWithRecovery(batch.slice(mid), stats);
    return [...left, ...right];
  }

  process.stderr.write(
    `[classify] marking candidate ${batch[0].id} as error\n`
  );
  return [
    {
      ...batch[0],
      status: "error" as DittoScanStatus,
      reason: "LLM classification failed after retries",
      confidence: 0,
      info_needed: null,
      decided_by: "llm" as const,
    },
  ];
}

async function classify(
  candidates: DittoScanCandidate[],
  preClassified: DittoScanResult[] = []
): Promise<DittoScanClassifyData> {
  const startedAt = new Date().toISOString();
  const promptHash = createHash("sha1")
    .update(SYSTEM_PROMPT)
    .digest("hex")
    .slice(0, 12);
  const stats: Stats = { llmCalls: 0, tokensIn: 0, tokensOut: 0 };
  const llmResults: DittoScanResult[] = [];

  const allBatches: DittoScanCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    allBatches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < allBatches.length; i += PARALLEL_BATCHES) {
    const chunk = allBatches.slice(i, i + PARALLEL_BATCHES);
    const chunkResults = await Promise.all(
      chunk.map((batch, j) => {
        const batchIdx = i + j + 1;
        process.stderr.write(
          `[classify] batch ${batchIdx}/${allBatches.length} (${batch.length} candidates)\n`
        );
        return classifyWithRecovery(batch, stats);
      })
    );
    for (const batchResult of chunkResults) {
      llmResults.push(...batchResult);
    }
  }

  // Rule-decided results lead so they appear first in the output file.
  // by_status / counts reflect the union.
  const results: DittoScanResult[] = [...preClassified, ...llmResults];

  const byStatus: Partial<Record<DittoScanStatus, number>> = {
    unsure: 0,
    error: 0,
  };
  // by_rule keys are `${language}:${reason}` so rule names that appear in
  // multiple languages (e.g. `logger_call` in JS / Kotlin / Swift) stay
  // distinguishable. Each rule file owns one logical concept per language;
  // collapsing across languages would hide which implementation is doing
  // the work.
  const byRule: Record<string, number> = {};
  let ruleCount = 0;
  let llmCount = 0;
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.decided_by === "rule") {
      ruleCount++;
      const key = `${r.language}:${r.reason}`;
      byRule[key] = (byRule[key] ?? 0) + 1;
    } else {
      llmCount++;
    }
  }

  const numResultsToManuallyValidate = results.filter(
    (r) => r.confidence < MIN_CONFIDENCE_LEVEL
  ).length;

  const finishedAt = new Date().toISOString();
  const summary: DittoScanSummary = {
    run_id: createHash("sha1")
      .update(`${startedAt}:${promptHash}`)
      .digest("hex")
      .slice(0, 16),
    started_at: startedAt,
    finished_at: finishedAt,
    model: CLASSIFY_MODEL,
    prompt_hash: promptHash,
    candidate_total: results.length,
    by_status: byStatus,
    num_results_to_manually_verify: numResultsToManuallyValidate,
    pct_results_needing_manual_verification:
      results.length > 0
        ? (numResultsToManuallyValidate / results.length) * 100
        : 0,
    llm_calls: stats.llmCalls,
    llm_tokens_in: stats.tokensIn,
    llm_tokens_out: stats.tokensOut,
    decided_by: { rule: ruleCount, llm: llmCount },
    by_rule: byRule,
  };

  return { results, summary };
}

export async function runClassify(
  options: DittoScanClassifyOptions
): Promise<DittoScanClassifyResult> {
  let candidates: DittoScanCandidate[];

  if (options.candidates) {
    candidates = options.candidates;
  } else if (options.inputPath) {
    const raw = await fs.readFile(options.inputPath, "utf8");
    candidates = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DittoScanCandidate);
  } else {
    const errorMessage =
      "Invalid inputs. Missing both 'candidates' and 'inputPath'";
    throw new DittoError({
      type: ErrorType.ScanError,
      data: { rawErrorMessage: errorMessage },
      message: errorMessage,
    });
  }

  const result = await classify(candidates, options.preClassified);

  const parsedOutput = path.parse(options.outputPath);
  const ext = parsedOutput.ext;
  const base = path.join(parsedOutput.dir, parsedOutput.name);

  const allStatuses: DittoScanStatus[] = [
    "user-facing",
    "not-user-facing",
    "unsure",
    "error",
  ];
  const resultsByStatus: Partial<Record<DittoScanStatus, string>> = {};
  await Promise.all(
    allStatuses.map(async (status) => {
      const statusResults = result.results.filter((r) => r.status === status);
      const filePath = `${base}-${status}${ext}`;
      if (statusResults.length === 0) {
        await fs.rm(filePath, { force: true });
        return;
      }
      await fs.writeFile(
        filePath,
        statusResults.map((r) => JSON.stringify(r)).join("\n") + "\n",
        "utf8"
      );
      resultsByStatus[status] = filePath;
    })
  );

  await fs.writeFile(
    options.summaryPath,
    JSON.stringify(result.summary, null, 2) + "\n",
    "utf8"
  );

  const toVerify = result.results.filter(
    (r) => r.confidence < MIN_CONFIDENCE_LEVEL
  );
  let writtenVerifyPath: string | null = null;
  if (toVerify.length > 0) {
    await fs.writeFile(
      options.verifyPath,
      toVerify.map((r) => JSON.stringify(r)).join("\n") + "\n",
      "utf8"
    );
    writtenVerifyPath = options.verifyPath;
  } else {
    await fs.rm(options.verifyPath, { force: true });
  }

  return {
    ...result,
    writtenPaths: { resultsByStatus, verify: writtenVerifyPath },
  };
}
