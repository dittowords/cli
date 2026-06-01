import { ACCEPT_RULES_BY_LANGUAGE, ACCEPT_RULES_COMMON } from "./accept";
import { REJECT_RULES_BY_LANGUAGE, REJECT_RULES_COMMON } from "./reject";
import type { Rule, RuleInput, RuleLanguage, RulesByLanguage, Verdict } from "./types";

export { shouldEmit } from "./drop";
export type { Rule, RuleInput, Verdict } from "./types";

// Guarded lookup for language-keyed rule maps. `candidate.language` is a
// free-form string at runtime (the extractor emits a wider set than rules
// dispatch on), so a value like "constructor" would otherwise surface an
// inherited prototype property and crash the `for...of` below.
function getLanguageRules(rules: RulesByLanguage, lang: string): Rule[] {
  return Object.prototype.hasOwnProperty.call(rules, lang) ? rules[lang as RuleLanguage] ?? [] : [];
}

// Apply the deterministic rule classifier to a candidate that has already
// cleared `shouldEmit`. Returns `{ kind: "llm" }` when no rule matches;
// the caller then sends the candidate to the LLM stage.
//
// Dispatch order, first match wins:
//   1. Reject before accept. A reject carve-out like Android
//      `translatable="false"` needs to win over a broad accept rule
//      (`resource_value`) that would otherwise fire on the same candidate.
//   2. Within reject (and within accept): language-specific before common.
//      Lets a per-language rule disambiguate a shape that the cross-language
//      list would otherwise treat generically.
//
// The candidate's `language` is a free string at the type level (the
// extractor emits a wider set than rules dispatch on, including
// regex-fallback extensions). The lookups below treat any non-RuleLanguage
// tag as "no language-specific rules", so the candidate flows naturally
// through common-then-llm.
export function getClassificationVerdict(input: RuleInput): Verdict {
  const lang = input.candidate.language;
  const rejectLangRules = getLanguageRules(REJECT_RULES_BY_LANGUAGE, lang);
  const acceptLangRules = getLanguageRules(ACCEPT_RULES_BY_LANGUAGE, lang);

  for (const rule of rejectLangRules) {
    if (rule.match(input)) return { kind: "reject", rule: rule.name };
  }
  for (const rule of REJECT_RULES_COMMON) {
    if (rule.match(input)) return { kind: "reject", rule: rule.name };
  }
  for (const rule of acceptLangRules) {
    if (rule.match(input)) return { kind: "accept", rule: rule.name };
  }
  for (const rule of ACCEPT_RULES_COMMON) {
    if (rule.match(input)) return { kind: "accept", rule: rule.name };
  }
  return { kind: "llm" };
}
