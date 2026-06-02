import type { Rule, RulesByLanguage } from "../types";

import { COMMON_REJECT_RULES } from "./common";
import { JAVASCRIPT_REJECT_RULES } from "./javascript";
import { KOTLIN_REJECT_RULES } from "./kotlin";
import { SWIFT_REJECT_RULES } from "./swift";

// Reject rules keyed by Candidate.language. Language-specific rules run
// before cross-language ones; the first match wins. The map is typed
// against `RulesByLanguage` (= `{ [K in RuleLanguage]?: Rule[] }`) so an
// unknown or misspelled key is a compile error.
export const REJECT_RULES_BY_LANGUAGE: RulesByLanguage = {
  javascript: JAVASCRIPT_REJECT_RULES,
  typescript: JAVASCRIPT_REJECT_RULES,
  jsx: JAVASCRIPT_REJECT_RULES,
  tsx: JAVASCRIPT_REJECT_RULES,
  // Vue files run their `<script>` body through the JS extractor, so
  // candidates with language="vue" share the JS callee shapes.
  vue: JAVASCRIPT_REJECT_RULES,
  swift: SWIFT_REJECT_RULES,
  kotlin: KOTLIN_REJECT_RULES,
};

export const REJECT_RULES_COMMON: Rule[] = COMMON_REJECT_RULES;
