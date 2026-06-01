import type { Rule } from "../types";

// Top-level logging functions in Swift. Each takes a message string in
// position 0 (or sometimes a variadic list of messages). Their content
// is debug output, never UI.
const LOGGER_CALLEES: ReadonlySet<string> = new Set(["print", "NSLog", "os_log", "debugPrint"]);

// Runtime-failure functions. The message arg shows up only in crash logs
// and Xcode debugger, not in normal UI. `precondition`/`assert` take the
// condition first and the message second; both arg positions get the same
// callee tag, so both reject.
const RUNTIME_FAIL_CALLEES: ReadonlySet<string> = new Set([
  "assert",
  "assertionFailure",
  "precondition",
  "preconditionFailure",
  "fatalError",
]);

// Top-level constructors / factory functions whose first string arg is a
// URL-like token, never copy.
const NON_TEXT_CALLEES: ReadonlySet<string> = new Set(["URL", "NSURL", "URLComponents"]);

export const SWIFT_REJECT_RULES: Rule[] = [
  {
    name: "logger_call",
    match: ({ context }) => (context.callee !== undefined ? LOGGER_CALLEES.has(context.callee) : false),
  },
  {
    name: "runtime_fail",
    match: ({ context }) => (context.callee !== undefined ? RUNTIME_FAIL_CALLEES.has(context.callee) : false),
  },
  {
    name: "non_text_call",
    match: ({ context }) => (context.callee !== undefined ? NON_TEXT_CALLEES.has(context.callee) : false),
  },
];
