import fs from "fs/promises";
import { globby } from "globby";
import path from "path";

const DEFAULT_PREVIEW_CHARS = 400;

export interface FileDiscoveryTask {
  taskName: string;
  globs: string[];
  ignore?: string[];
  // Synchronous reject before heuristic to skip obvious non-matches.
  preFilter?: (basename: string, relPath: string) => boolean;
  // Confirmed without the heuristic (e.g. single-purpose extensions).
  autoInclude?: (relPath: string) => boolean;
  // Called with the relative path and a content preview for every file
  // that survived preFilter/autoInclude. Return true to include the file.
  heuristicMatch: (relPath: string, preview: string) => boolean;
  previewChars?: number;
}

export interface FileDiscoveryStats {
  task: string;
  totalCandidates: number;
  preFiltered: number;
  autoIncluded: number;
  heuristicConsidered: number;
  heuristicConfirmed: number;
  elapsedMs: number;
}

export interface FileDiscoveryResult {
  paths: Set<string>;
  stats: FileDiscoveryStats;
}

// Keep legacy aliases so callers can migrate at their own pace.
/** @deprecated Use FileDiscoveryTask */
export type LlmFileTask = FileDiscoveryTask;
/** @deprecated Use FileDiscoveryStats */
export type LlmFileTaskStats = FileDiscoveryStats;
/** @deprecated Use FileDiscoveryResult */
export type LlmFileTaskResult = FileDiscoveryResult;

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

export async function runFileDiscoveryTask(
  rootPath: string,
  task: FileDiscoveryTask
): Promise<FileDiscoveryResult> {
  const t0 = Date.now();
  const root = path.resolve(rootPath);
  const stats: FileDiscoveryStats = {
    task: task.taskName,
    totalCandidates: 0,
    preFiltered: 0,
    autoIncluded: 0,
    heuristicConsidered: 0,
    heuristicConfirmed: 0,
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
  const toCheck: string[] = [];

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
    toCheck.push(relPath);
  }
  stats.heuristicConsidered = toCheck.length;

  const previewChars = sanitizePositiveInt(task.previewChars, DEFAULT_PREVIEW_CHARS);

  await Promise.all(
    toCheck.map(async (relPath) => {
      const preview = await readPreview(path.join(root, relPath), previewChars);
      if (preview !== null && task.heuristicMatch(relPath, preview)) {
        confirmed.add(relPath);
      }
    })
  );

  stats.heuristicConfirmed = confirmed.size - stats.autoIncluded;
  stats.elapsedMs = Date.now() - t0;
  return { paths: confirmed, stats };
}

/** @deprecated Use runFileDiscoveryTask */
export const runLlmFileTask = runFileDiscoveryTask;

async function readPreview(
  absPath: string,
  previewChars: number
): Promise<string | null> {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(absPath, "r");
    // UTF-8 expansion is at most 4 bytes/char; one extra byte lets us
    // detect overflow without rereading.
    const buf = new Uint8Array(previewChars * 4 + 1);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    const decoded = Buffer.from(buf.buffer, buf.byteOffset, bytesRead).toString(
      "utf8"
    );
    return decoded.slice(0, previewChars);
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

function sanitizePositiveInt(
  value: number | undefined,
  fallback: number
): number {
  const n = Number(value ?? fallback);
  return Math.max(1, Math.floor(Number.isFinite(n) ? n : fallback));
}
