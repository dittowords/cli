import type { DittoScanCandidate, DittoScanEnclosingContext } from "../types";

// Languages the rule classifier dispatches on. The extractor layer
// emits a wider set of `Candidate.language` values (e.g. `ios_strings`,
// or a regex-fallback extension like `py`), but rules only branch on
// the subset below. The BY_LANGUAGE maps in `accept/index.ts` and
// `reject/index.ts` are typed against this set so a typo or unknown
// key is a compile error.
export type RuleLanguage =
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "vue"
  | "kotlin"
  | "swift";

// Optional per-language rule list. Not every RuleLanguage needs an
// entry; missing keys produce no language-specific rules and the
// classifier falls through to common.
export type RulesByLanguage = { [K in RuleLanguage]?: Rule[] };

// Outcome of running the rule classifier on a single candidate.
//   `drop`    Discarded by `shouldEmit`. No Result is written.
//   `accept`  Deterministically user-facing. Pre-classify writes a Result
//             with status="user-facing", confidence=1, decided_by="rule",
//             reason=`rule:<rule>`. The LLM never sees it.
//   `reject`  Deterministically not user-facing. Same as accept but with
//             status="not-user-facing".
//   `llm`     No deterministic verdict; falls through to the LLM stage.
export type Verdict =
  | { kind: "drop" }
  | { kind: "accept"; rule: string }
  | { kind: "reject"; rule: string }
  | { kind: "llm" };

// A single deterministic accept-or-reject rule. The classifier walks
// language-specific rules before common ones, and rejects before accepts,
// so the first matching rule wins. Rules see both the public Candidate
// (the LLM-visible shape) and the internal EnclosingContext (which carries
// callee, parentTag, methodName — fields not part of the Candidate payload).
export interface RuleInput {
  candidate: DittoScanCandidate;
  context: DittoScanEnclosingContext;
}

export interface Rule {
  name: string;
  match(input: RuleInput): boolean;
}
