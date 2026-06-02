import type { Rule } from "../types";

// No cross-language reject rules at present. We previously rejected
// Android `<string translatable="false">` entries on the theory that
// they're developer-only configuration values. In practice many of
// those entries are real UI copy that the developer just chose not to
// localize (app names, brand strings, accessibility labels), so they
// flow through as `resource_value` accepts like everything else.
export const COMMON_REJECT_RULES: Rule[] = [];
