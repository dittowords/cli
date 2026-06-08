import axios, { AxiosError } from "axios";
import getHttpClient from "./client";
import { IInitiateScanResponse, ZInitiateScanResponse } from "./types";
import { DittoScanCandidate } from "../scan/types";
import { Blob } from "buffer";

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
