import type { Rule } from "../types";

// Members of `console.*` whose string args are debug output. We list the
// methods that take strings explicitly so we don't sweep up unrelated
// future additions to the console API.
const CONSOLE_METHODS: ReadonlySet<string> = new Set([
  "log",
  "warn",
  "error",
  "info",
  "debug",
  "trace",
  "assert",
  "dir",
  "table",
  "group",
  "groupCollapsed",
  "time",
  "timeLog",
  "timeEnd",
  "count",
  "countReset",
]);

// Top-level function / constructor names whose first string arg is an
// opaque token, not user-facing copy. `URL`, `URLSearchParams`, etc. cover
// both `new URL("...")` and the (less common) `URL("...")` call form.
const NON_TEXT_BARE_CALLEES: ReadonlySet<string> = new Set([
  "Symbol",
  "BigInt",
  "Number",
  "Date",
  "parseInt",
  "parseFloat",
  "atob",
  "btoa",
  "encodeURIComponent",
  "decodeURIComponent",
  "encodeURI",
  "decodeURI",
  "URL",
  "URLSearchParams",
]);

// Member calls `Foo.method(...)` whose first string arg is a serialized
// payload or binary token, not copy.
const NON_TEXT_MEMBER_CALLS: ReadonlyArray<readonly [string, string]> = [
  ["JSON", "parse"],
  ["JSON", "stringify"],
  ["Buffer", "from"],
];

export const JAVASCRIPT_REJECT_RULES: Rule[] = [
  {
    name: "logger_call",
    match: ({ context }) =>
      context.callee === "console" && context.calleeMember !== undefined && CONSOLE_METHODS.has(context.calleeMember),
  },
  {
    name: "non_text_call",
    match: ({ context }) => {
      if (!context.callee) return false;
      if (context.calleeMember === undefined) {
        return NON_TEXT_BARE_CALLEES.has(context.callee);
      }
      for (const [receiver, method] of NON_TEXT_MEMBER_CALLS) {
        if (context.callee === receiver && context.calleeMember === method) return true;
      }
      return false;
    },
  },
];
