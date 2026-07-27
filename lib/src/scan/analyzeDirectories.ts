import path from "path";

// The rollup key for the input root. Candidate file paths are POSIX and
// relative to the scanned root, so the root itself is the empty prefix.
const ROOT = "";

// The literal we suggest users run.
const CLI_INVOCATION = "npx @dittowords/cli scan";

export interface DirectorySuggestion {
  dir: string;
  count: number;
}

export interface DirectoryAnalysis {
  total: number;
  limit: number;
  // Largest subtrees that each fit under the limit, sorted by descending count
  // (tie-break: directory name ascending), capped.
  suggestions: DirectorySuggestion[];
  // Number of fitting subtrees beyond the cap.
  omittedFittingCount: number;
}

export function analyzeDirectories(
  filePaths: string[],
  limit: number,
  cap = 10
): DirectoryAnalysis {
  const total = filePaths.length;
  const subtree = rollupCandidateCountsToParentPaths(filePaths);

  // A directory fits (<= limit) and its parent does not.
  // ROOT never qualifies because we only get here when total > limit.
  const suggestedPaths: DirectorySuggestion[] = [];
  for (const [dir, count] of subtree) {
    if (dir === ROOT || count > limit) continue;
    const parent = parentDirName(dir);
    const parentCount = parent === null ? total : subtree.get(parent) ?? total;
    if (parentCount > limit) suggestedPaths.push({ dir, count });
  }

  // Sort by descending count, tie-break by directory name; cap.
  suggestedPaths.sort((a, b) => b.count - a.count || (a.dir < b.dir ? -1 : 1));
  const cappedSuggestedPaths = suggestedPaths.slice(0, cap);
  const omittedFittingCount =
    suggestedPaths.length - cappedSuggestedPaths.length;
  return {
    total,
    limit,
    suggestions: cappedSuggestedPaths,
    omittedFittingCount,
  };
}

// Given a list of candidate file paths, returns a map of paths to the sum of candidates
// in that path and any sub directories under that path.
export function rollupCandidateCountsToParentPaths(
  filePaths: string[]
): Map<string, number> {
  const candidateCountByPath = new Map<string, number>();
  for (const path of filePaths) {
    for (const dependentDir of parentDirsOf(path)) {
      candidateCountByPath.set(
        dependentDir,
        (candidateCountByPath.get(dependentDir) ?? 0) + 1
      );
    }
  }
  return candidateCountByPath;
}

// "a/b/c" -> "a/b" ; "a" -> ROOT ; ROOT -> null
function parentDirName(dir: string): string | null {
  if (dir === ROOT) return null;
  const i = dir.lastIndexOf("/");
  return i === -1 ? ROOT : dir.slice(0, i);
}

// "a/b/c.ts" -> ["a/b", "a", ROOT] (directories only, nearest first)
function parentDirsOf(file: string): string[] {
  const parents: string[] = [];
  for (let d = parentDirName(file); d !== null; d = parentDirName(d))
    parents.push(d);
  return parents;
}

// Builds the user-facing message shown when a scan exceeds the plan limit.
// `originalPath` is the path argument as the user typed it.
export function formatOverLimitMessage(
  analysis: DirectoryAnalysis,
  opts: { plan?: string; originalPath: string }
): string {
  const { total, limit, suggestions, omittedFittingCount } = analysis;
  const root = displayRoot(opts.originalPath);

  const header = `This scan found ${fmtCount(
    total
  )} strings, but your ${planLabel(opts.plan)} allows ${fmtCount(
    limit
  )} per scan.`;

  if (suggestions.length === 0) {
    return [
      header,
      "",
      `There's no subdirectory small enough to scan on its own — all ${fmtCount(
        total
      )} strings are in files at the top level of \`${root}\`. Point the scan at a narrower path to stay under the limit.`,
    ].join("\n");
  }

  const commands = suggestions.map(
    (s) => `${CLI_INVOCATION} ${joinDisplayPath(opts.originalPath, s.dir)}`
  );
  const width = Math.max(...commands.map((c) => c.length));
  const lines = suggestions.map(
    (s, i) => `  ${commands[i].padEnd(width)}   (${fmtCount(s.count)} strings)`
  );
  if (omittedFittingCount > 0) {
    lines.push(`  … and ${fmtCount(omittedFittingCount)} more`);
  }

  return [
    header,
    "",
    "Scan one of these subdirectories instead. Each fits within your plan:",
    "",
    ...lines,
    "",
    `Run \`${CLI_INVOCATION} ${root} --list-directories\` for the full breakdown.`,
  ].join("\n");
}

// Full rolled-up per-directory breakdown for the --list-directories flag.
// Directories are printed in tree order (a parent precedes its children,
// siblings alphabetical), which plain lexicographic sort of POSIX paths yields.
export function formatDirectoryBreakdown(
  filePaths: string[],
  originalPath: string
): string {
  const subtree = rollupCandidateCountsToParentPaths(filePaths);
  if (!subtree.has(ROOT)) subtree.set(ROOT, 0);

  const dirs = [...subtree.keys()].sort();
  const width = Math.max(
    ...dirs.map((d) => fmtCount(subtree.get(d) ?? 0).length)
  );

  const root = displayRoot(originalPath);
  const rows = dirs.map((dir) => {
    const count = fmtCount(subtree.get(dir) ?? 0).padStart(width);
    const depth = dir === ROOT ? 0 : dir.split("/").length - 1;
    const label = dir === ROOT ? ".  (whole scan)" : dir;
    return `  ${count}  ${"  ".repeat(depth)}${label}`;
  });

  return [`Strings by directory (rolled up), under ${root}:`, "", ...rows].join(
    "\n"
  );
}

// Joins the user's original (as-typed) path argument with a suggested relative
// directory to produce a ready-to-run command path. Normalizes to POSIX and
// collapses "./" and trailing slashes so the printed command is clean.
export function joinDisplayPath(originalInput: string, relDir: string): string {
  const base = originalInput.replace(/\\/g, "/");
  return path.posix.join(base, relDir);
}

// The root path as the user typed it, normalized for display.
// Empty input renders as ".".
function displayRoot(originalInput: string): string {
  const normalized = path.posix.join(originalInput.replace(/\\/g, "/"), ".");
  return normalized === "" ? "." : normalized;
}

function planLabel(plan?: string): string {
  return plan ? `${plan} plan` : "plan";
}

function fmtCount(n: number): string {
  return n.toLocaleString("en-US");
}
