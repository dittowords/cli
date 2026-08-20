import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Where a scan came from. `repoKey` and `commitSha` identify the same commit
 * from any clone; `repoRoot` is local to this machine and isn't uploaded.
 */
export interface GitContext {
  /** Host and path of `origin`, normalized: `github.com/dittowords/cli`. */
  repoKey: string;
  /** Absolute path to the working tree. Local only — used to make candidate paths repo-root-relative. */
  repoRoot: string;
  commitSha: string;
  /** `null` when HEAD is detached, as it is after `actions/checkout`. */
  branch: string | null;
  /** Uncommitted changes are present, so `commitSha` doesn't fully describe what was scanned. */
  dirty: boolean;
}

/**
 * Copied from `shared/types/ProductTextDetection.ts` in `ditto-app`
 */
export const REPO_KEY_PATTERN =
  /^[a-z0-9.-]+(\/[a-z0-9._-]+){1,}\/(?!.*\.git$)[a-z0-9._-]+$/;

/**
 * The scp-like remote form `git@github.com:Ditto/App.git`, which has no scheme
 * and so isn't a URL. Captures the host and the path around the colon.
 */
const SCP_LIKE = /^(?:[^/@]+@)?([^/:]+):(.+)$/;

/**
 * Reduces a remote URL to a repo key: both `git@github.com:Ditto/App.git` and
 * `https://github.com/ditto/app` give `github.com/ditto/app`. Parsing drops
 * any credentials and port; nested subgroup paths survive.
 *
 * @returns The key, or `null` if it doesn't parse or fails `REPO_KEY_PATTERN`.
 */
export function normalizeRepoKey(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) return null;

  let host: string;
  let pathname: string;

  if (trimmed.includes("://")) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    host = url.hostname;
    pathname = url.pathname;
  } else {
    const scp = SCP_LIKE.exec(trimmed);
    if (!scp) return null;
    host = scp[1];
    pathname = scp[2];
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  segments[segments.length - 1] = segments[segments.length - 1].replace(
    /\.git$/,
    ""
  );
  if (!segments[segments.length - 1]) return null;

  const key = [host, ...segments].join("/").toLowerCase();
  return REPO_KEY_PATTERN.test(key) ? key : null;
}

/** Trimmed stdout, or `null` if git is missing or exits non-zero. */
async function git(args: string[], cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Reads the git context a scan uploads with its candidates, discovering the
 * repo from `startDir`. `branch` is `null` on a detached HEAD.
 *
 * @returns `null` — never throws — with no git, repo, commit, or usable
 * `origin`.
 */
export async function readGitContext(
  startDir: string
): Promise<GitContext | null> {
  const repoRoot = await git(["rev-parse", "--show-toplevel"], startDir);
  if (!repoRoot) return null;

  const commitSha = await git(["rev-parse", "HEAD"], repoRoot);
  if (!commitSha) return null;

  const remoteUrl = await git(["remote", "get-url", "origin"], repoRoot);
  const repoKey = remoteUrl ? normalizeRepoKey(remoteUrl) : null;
  if (!repoKey) return null;

  const branch = await git(
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    repoRoot
  );
  const status = await git(["status", "--porcelain"], repoRoot);

  return {
    repoKey,
    repoRoot,
    commitSha,
    branch: branch || null,
    dirty: Boolean(status),
  };
}
