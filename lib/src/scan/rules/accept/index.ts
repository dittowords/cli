import type { Rule, RulesByLanguage } from "../types";

import { COMMON_ACCEPT_RULES } from "./common";
import { KOTLIN_ACCEPT_RULES } from "./kotlin";
import { SWIFT_ACCEPT_RULES } from "./swift";

// Accept rules keyed by Candidate.language. Language-specific rules run
// before cross-language ones; the first match wins. The map is typed
// against `RulesByLanguage` (= `{ [K in RuleLanguage]?: Rule[] }`) so an
// unknown or misspelled key is a compile error.
export const ACCEPT_RULES_BY_LANGUAGE: RulesByLanguage = {
  kotlin: KOTLIN_ACCEPT_RULES,
  swift: SWIFT_ACCEPT_RULES,
};

export const ACCEPT_RULES_COMMON: Rule[] = COMMON_ACCEPT_RULES;
