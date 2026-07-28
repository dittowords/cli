import axios, { AxiosError } from "axios";
import getHttpClient from "./client";
import { IInitiateScanResponse, ZInitiateScanResponse } from "./types";
import { DittoScanCandidate } from "../scan/types";
import DittoError, { ErrorType } from "../utils/DittoError";
import { Blob } from "buffer";

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

export async function initiateScan(
  path: string
): Promise<IInitiateScanResponse> {
  try {
    const httpClient = getHttpClient({});
    const response = await httpClient.post("/v2/scan", { path });
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
