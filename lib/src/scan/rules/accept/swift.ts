import type { Rule } from "../types";

// SwiftUI string arguments are often user-facing, but can also be
// localization keys. Keep those ambiguous cases on the LLM path.
export const SWIFT_ACCEPT_RULES: Rule[] = [];
