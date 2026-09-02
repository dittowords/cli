import { DittoScanCandidate } from "@dittowords/text-extract";
import axios, { AxiosError } from "axios";
import { Blob } from "buffer";
import { relative, sep } from "node:path";
import { GitContext, GitRename } from "../scan/git";
import DittoError, { ErrorType } from "../utils/DittoError";
import getHttpClient from "./client";
import {
  IInitiateScanBody,
  IInitiateScanResponse,
  ZGetLastScannedCommitResponse,
  ZInitiateScanResponse,
} from "./types";

// Structured details from the classify step's SCAN_CANDIDATE_LIMIT_EXCEEDED
// response.
export class ScanLimitExceededError extends Error {
  candidateCount?: number;
  limit?: number;
  used?: number;
  plan?: string;

  constructor(details: {
    candidateCount?: number;
    limit?: number;
    plan?: string;
    used?: number;
    message?: string;
  }) {
    super(details.message ?? "Scan candidate limit exceeded");
    this.name = "ScanLimitExceededError";
    this.candidateCount = details.candidateCount;
    this.limit = details.limit;
    this.plan = details.plan;
    this.used = details.used;
  }
}

export interface ScanLimitInfo {
  candidateCount?: number;
  used: number | null;
  limit: number | null;
  plan?: string;
  message?: string;
}

export function asScanLimitInfo(e: unknown): ScanLimitInfo | null {
  if (!(e instanceof ScanLimitExceededError)) return null;
  return {
    candidateCount: e.candidateCount,
    limit: e.limit ?? null,
    plan: e.plan,
    used: e.used ?? null,
    message: e.message,
  };
}

// Fallback message used only when we know the scan is over the limit but the
// server gave no numeric limit to analyze against.
export function scanLimitError(
  serverMessage: string
): DittoError<ErrorType.ScanError> {
  const message = [
    serverMessage,
    "",
    "Scan a smaller subdirectory, e.g. `npx @dittowords/cli scan ./src`.",
  ].join("\n");

  return new DittoError({
    type: ErrorType.ScanError,
    message,
    exitCode: 1,
    expected: true,
    data: { rawErrorMessage: serverMessage },
  });
}

/**
 * Where the scanned directory sits inside the repo, as a forward-slash path the
 * server prefixes onto candidate paths to build code links (`toRepoRelativePath`
 * in ditto-app `services/ai/productTextDetection/codeLinks.ts`). `""` when the
 * scan is the repo root, and `undefined` when the scanned path is somehow
 * outside the repo, so a bad value never becomes a wrong link.
 */
function repoRelativeRoot(
  scannedPath: string,
  repoRoot: string
): string | undefined {
  const rel = relative(repoRoot, scannedPath);
  if (rel.startsWith("..")) return undefined;
  return sep === "/" ? rel : rel.split(sep).join("/");
}

/**
 * What the scan looked at, so the server only marks a code link removed where we
 * actually looked. `scannedAllPaths` means the whole repo. Otherwise it's the one
 * directory we scanned. Empty when the path is outside the repo, which the server
 * treats as "looked nowhere".
 */
function scannedScope(root: string | undefined) {
  if (root === undefined) return {};
  if (root === "") return { repoRelativeRoot: root, scannedAllPaths: true };
  return {
    repoRelativeRoot: root,
    scannedAllPaths: false,
    scannedPaths: [root],
  };
}

/**
 * The most renames one scan carries, matching `MAX_SCAN_RENAMES` in ditto-app
 */
export const MAX_SCAN_RENAMES = 1000;

/**
 * Builds the `POST /v2/scan` body. Without git context the body is exactly what
 * the CLI has always sent, so a scan outside a repo is unaffected.
 */
export function buildInitiateScanBody(
  path: string,
  gitContext?: GitContext | null,
  renamesSinceLastScan: GitRename[] = []
): IInitiateScanBody {
  if (!gitContext) return { path };
  const root = repoRelativeRoot(path, gitContext.repoRoot);
  return {
    path,
    repoKey: gitContext.repoKey,
    gitCommitSha: gitContext.commitSha,
    gitBranch: gitContext.branch,
    ...scannedScope(root),
    ...(renamesSinceLastScan.length
      ? {
          renamesSinceLastScan: renamesSinceLastScan.slice(0, MAX_SCAN_RENAMES),
        }
      : {}),
  };
}

export async function initiateScan(
  path: string,
  gitContext?: GitContext | null,
  renamesSinceLastScan: GitRename[] = []
): Promise<IInitiateScanResponse> {
  const body = buildInitiateScanBody(path, gitContext, renamesSinceLastScan);

  try {
    const httpClient = getHttpClient({});
    const response = await httpClient.post("/v2/scan", body);
    return ZInitiateScanResponse.parse(response.data);
  } catch (e) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }
    throw e;
  }
}

/**
 * The commit the last scan of this repo read, or `null` when the server has none,
 * doesn't know the route, or can't be reached.
 */
export async function getLastScannedCommit(
  repoKey: string
): Promise<string | null> {
  try {
    const httpClient = getHttpClient({});
    const response = await httpClient.get("/v2/scan/last-scanned-commit", {
      params: { repoKey },
    });
    return (
      ZGetLastScannedCommitResponse.parse(response.data).lastScannedCommit ??
      null
    );
  } catch {
    return null;
  }
}

export async function initiateClassify(scanId: string): Promise<void> {
  try {
    const httpClient = getHttpClient({});
    await httpClient.post(`/v2/scan/${scanId}/classify`, {});
  } catch (e) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    const data = e.response?.data;
    if (data?.code === "SCAN_CANDIDATE_LIMIT_EXCEEDED") {
      throw new ScanLimitExceededError({
        candidateCount:
          typeof data.candidateCount === "number"
            ? data.candidateCount
            : undefined,
        limit: typeof data.limit === "number" ? data.limit : undefined,
        plan: typeof data.plan === "string" ? data.plan : undefined,
        used: typeof data.used === "number" ? data.used : undefined,
        message: typeof data.message === "string" ? data.message : undefined,
      });
    }
    if (data?.message) throw new Error(data.message);
    throw e;
  }
}

export async function uploadCandidatesToS3(
  candidates: DittoScanCandidate[],
  signedUrl: string
) {
  // Convert TypeScript array to NDJSON format (JSON objects separated by \n)
  const ndjsonString = candidates
    .map((candidate) => JSON.stringify(candidate))
    .join("\n");

  // Create a Blob from the NDJSON string
  const blob = new Blob([ndjsonString], { type: "application/x-ndjson" });

  // Upload via PUT request to the pre-signed URL
  // Needs to be done with a non-ditto http client so we don't pass our auth token
  const httpClient = axios.create({});
  const response = await httpClient.put(signedUrl, blob, {
    headers: {
      // S3 requires the Content-Length header for PUT requests
      "Content-Length": blob.size,
    },
  });
  return response;
}
