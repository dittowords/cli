import type { DittoScanCandidate, DittoScanResult } from "./types";
import type { Verdict } from "./rules";

export interface DittoScanPreClassifyResult {
  // Candidates the rule classifier did not decide on. These flow to the
  // LLM stage.
  llmCandidates: DittoScanCandidate[];
  // Candidates the rule classifier decided. Each is materialized as a
  // Result with confidence=1 and decided_by="rule" so it interleaves with
  // LLM-decided results in the final output.
  preClassified: DittoScanResult[];
}

// Bridge between `runExtract` (which produces Candidates + Verdicts) and
// `runClassify` (which only wants LLM-bound Candidates). Splits the
// extract output and materializes rule-decided Results.
export function preClassify(
  candidates: DittoScanCandidate[],
  verdicts: Map<string, Verdict>
): DittoScanPreClassifyResult {
  const llmCandidates: DittoScanCandidate[] = [];
  const preClassified: DittoScanResult[] = [];

  for (const c of candidates) {
    const verdict = verdicts.get(c.id) ?? { kind: "llm" as const };
    if (verdict.kind === "accept") {
      preClassified.push({
        ...c,
        status: "user-facing",
        reason: `rule:${verdict.rule}`,
        confidence: 1,
        info_needed: null,
        decided_by: "rule",
      });
    } else if (verdict.kind === "reject") {
      preClassified.push({
        ...c,
        status: "not-user-facing",
        reason: `rule:${verdict.rule}`,
        confidence: 1,
        info_needed: null,
        decided_by: "rule",
      });
    } else {
      llmCandidates.push(c);
    }
  }

  return { llmCandidates, preClassified };
}
