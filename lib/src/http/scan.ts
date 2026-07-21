import axios, { AxiosError } from "axios";
import chalk from "chalk";
import getHttpClient from "./client";
import { IInitiateScanResponse, ZInitiateScanResponse } from "./types";
import { DittoScanCandidate } from "../scan/types";
import DittoError, { ErrorType } from "../utils/DittoError";
import { Blob } from "buffer";

// Deep-links to the home page with the billing/upgrade modal open.
const BILLING_URL = "https://app.dittowords.com/home?openBillingModal=true";

// OSC 8 hyperlink: renders `label` as a clickable link to `href` in terminals
// that support it.
function terminalLink(label: string, href: string): string {
  const OSC = "\u001B]8;;";
  const BEL = "\u0007";
  return `${OSC}${href}${BEL}${chalk.blueBright.underline(label)}${OSC}${BEL}`;
}

// Turns the server's plan-limit response into a message with concrete next
// steps: upgrade, or scan a smaller path.
function scanLimitError(serverMessage: string): DittoError<ErrorType.ScanError> {
  const message = [
    serverMessage,
    "",
    "To scan more strings, you can either:",
    `  • Upgrade your plan at ${terminalLink("app.dittowords.com", BILLING_URL)}`,
    "  • Scan a smaller subdirectory, e.g. `npx @dittowords/cli scan ./src`",
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
      throw scanLimitError(data.message);
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
