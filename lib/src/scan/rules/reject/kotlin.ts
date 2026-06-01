import type { Rule } from "../types";

// Receiver names whose methods are logging APIs. We allowlist the actual
// log methods rather than accepting any member on Log/Timber, so a class
// shadowing the name (or a non-logging static on the same object — e.g.
// `Log.getStackTraceString(...)` returns a string but isn't user output)
// doesn't get auto-rejected.
const LOGGER_RECEIVERS: ReadonlySet<string> = new Set(["Log", "Timber"]);
const LOGGER_RECEIVER_METHODS: ReadonlySet<string> = new Set([
  // android.util.Log levels
  "v",
  "d",
  "i",
  "w",
  "e",
  "wtf",
  // Timber API surface — same levels plus tree/tag plumbing
  "tag",
  "log",
  "plant",
  "uproot",
]);

// Bare-identifier calls whose first string arg is a debug message.
const LOGGER_BARE_CALLEES: ReadonlySet<string> = new Set(["println", "print"]);

// Bare-identifier calls whose message arg is a runtime-failure reason.
// `check`/`require` accept a String or a String-returning lambda; we tag
// the string literal inside either form.
const RUNTIME_FAIL_CALLEES: ReadonlySet<string> = new Set([
  "error",
  "check",
  "checkNotNull",
  "require",
  "requireNotNull",
  "TODO",
]);

// Bare-identifier constructors whose first string arg is a URL or regex
// pattern, not copy.
const NON_TEXT_CALLEES: ReadonlySet<string> = new Set(["URL", "URI"]);

// Member calls `Foo.method(...)` whose first string arg is non-text.
const NON_TEXT_MEMBER_CALLS: ReadonlyArray<readonly [string, string]> = [["Pattern", "compile"]];

export const KOTLIN_REJECT_RULES: Rule[] = [
  {
    name: "logger_call",
    match: ({ context }) => {
      if (!context.callee) return false;
      if (context.calleeMember !== undefined) {
        return LOGGER_RECEIVERS.has(context.callee) && LOGGER_RECEIVER_METHODS.has(context.calleeMember);
      }
      return LOGGER_BARE_CALLEES.has(context.callee);
    },
  },
  {
    name: "runtime_fail",
    match: ({ context }) =>
      context.callee !== undefined && context.calleeMember === undefined && RUNTIME_FAIL_CALLEES.has(context.callee),
  },
  {
    name: "non_text_call",
    match: ({ context }) => {
      if (!context.callee) return false;
      if (context.calleeMember === undefined) {
        return NON_TEXT_CALLEES.has(context.callee);
      }
      for (const [receiver, method] of NON_TEXT_MEMBER_CALLS) {
        if (context.callee === receiver && context.calleeMember === method) return true;
      }
      return false;
    },
  },
];
