import fs from "fs/promises";
import { globby } from "globby";
import path from "path";
import { z } from "zod";

import { callGemini } from "../../services/gemini";

// Generic LLM file classifier. Each task supplies globs + a system
// prompt; Gemini picks the matching subset. i18n discovery is one
// task; future passes (exclusion lists, OpenAPI specs, …) plug in the
// same way.

const DEFAULT_PREVIEW_CHARS = 400;
const DEFAULT_MAX_FILES_PER_CALL = 250;

export interface LlmFileTask {
  taskName: string;
  globs: string[];
  ignore?: string[];
  // Synchronous reject before the LLM call to save tokens.
  preFilter?: (basename: string, relPath: string) => boolean;
  // Confirmed without the LLM (e.g. single-purpose extensions).
  autoInclude?: (relPath: string) => boolean;
  systemPrompt: string;
  previewChars?: number;
  maxFilesPerCall?: number;
}

export interface LlmFileTaskStats {
  task: string;
  totalCandidates: number;
  preFiltered: number;
  autoIncluded: number;
  llmConsidered: number;
  llmConfirmed: number;
  promptTokens: number;
  completionTokens: number;
  llmCalls: number;
  elapsedMs: number;
}

export interface LlmFileTaskResult {
  paths: Set<string>;
  stats: LlmFileTaskStats;
}

const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/vendor/**",
];

const ZResponse = z.object({
  matching_paths: z.array(z.string()),
});

export async function runLlmFileTask(
  rootPath: string,
  task: LlmFileTask
): Promise<LlmFileTaskResult> {
  const t0 = Date.now();
  const root = path.resolve(rootPath);
  const stats: LlmFileTaskStats = {
    task: task.taskName,
    totalCandidates: 0,
    preFiltered: 0,
    autoIncluded: 0,
    llmConsidered: 0,
    llmConfirmed: 0,
    promptTokens: 0,
    completionTokens: 0,
    llmCalls: 0,
    elapsedMs: 0,
  };

  const allPaths = await globby(task.globs, {
    cwd: root,
    gitignore: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true,
    ignore: [...DEFAULT_IGNORE, ...(task.ignore ?? [])],
  });
  stats.totalCandidates = allPaths.length;

  const confirmed = new Set<string>();
  const toAsk: string[] = [];

  for (const relPath of allPaths) {
    const base = path.basename(relPath);
    if (task.preFilter && task.preFilter(base, relPath)) {
      stats.preFiltered++;
      continue;
    }
    if (task.autoInclude && task.autoInclude(relPath)) {
      confirmed.add(relPath);
      stats.autoIncluded++;
      continue;
    }
    toAsk.push(relPath);
  }
  stats.llmConsidered = toAsk.length;

  if (toAsk.length === 0) {
    stats.elapsedMs = Date.now() - t0;
    return { paths: confirmed, stats };
  }

  const previewChars = sanitizePositiveInt(
    task.previewChars,
    DEFAULT_PREVIEW_CHARS
  );
  const batchSize = sanitizePositiveInt(
    task.maxFilesPerCall,
    DEFAULT_MAX_FILES_PER_CALL
  );

  for (let i = 0; i < toAsk.length; i += batchSize) {
    const batch = toAsk.slice(i, i + batchSize);
    const confirmedFromBatch = await runBatch({
      root,
      batch,
      systemPrompt: task.systemPrompt,
      previewChars,
      stats,
    });
    for (const p of confirmedFromBatch) confirmed.add(p);
  }

  stats.llmConfirmed = confirmed.size - stats.autoIncluded;
  stats.elapsedMs = Date.now() - t0;
  return { paths: confirmed, stats };
}

async function runBatch(args: {
  root: string;
  batch: string[];
  systemPrompt: string;
  previewChars: number;
  stats: LlmFileTaskStats;
}): Promise<string[]> {
  const { root, batch, systemPrompt, previewChars, stats } = args;
  const samples = await Promise.all(
    batch.map(async (relPath) => {
      let handle: fs.FileHandle | null = null;
      try {
        handle = await fs.open(path.join(root, relPath), "r");
        // UTF-8 expansion is at most 4 bytes/char; one extra byte lets us
        // detect overflow without rereading.
        const buf = new Uint8Array(previewChars * 4 + 1);
        const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
        const decoded = Buffer.from(
          buf.buffer,
          buf.byteOffset,
          bytesRead
        ).toString("utf8");
        const preview = decoded.slice(0, previewChars);
        const truncated =
          decoded.length > previewChars || bytesRead === buf.length;
        return {
          relPath,
          preview: preview + (truncated ? "…(truncated)" : ""),
        };
      } catch {
        return null;
      } finally {
        await handle?.close();
      }
    })
  );
  const valid = samples.filter(
    (s): s is { relPath: string; preview: string } => s !== null
  );
  if (valid.length === 0) return [];

  const userPrompt = [
    "For each of the following files, decide whether it matches the task in the system instructions.",
    'Return ONLY the paths that match, exactly as given, in the "matching_paths" array.',
    "",
    ...valid.map(
      (f, i) =>
        `[File ${i + 1}]\npath: ${f.relPath}\npreview:\n${f.preview}\n[/File ${
          i + 1
        }]`
    ),
  ].join("\n");

  stats.llmCalls++;
  const result = await callGemini(userPrompt, ZResponse, systemPrompt);
  if (!result) return [];

  stats.promptTokens +=
    result.metadata.geminiUsageMetadata?.promptTokenCount ?? 0;
  stats.completionTokens +=
    result.metadata.geminiUsageMetadata?.candidatesTokenCount ?? 0;

  // Drop any path the LLM returned that wasn't in the batch.
  const seen = new Set(valid.map((v) => v.relPath));
  return result.data.matching_paths.filter((p) => seen.has(p));
}

function sanitizePositiveInt(
  value: number | undefined,
  fallback: number
): number {
  const n = Number(value ?? fallback);
  return Math.max(1, Math.floor(Number.isFinite(n) ? n : fallback));
}
