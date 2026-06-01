import type {
  DittoScanCandidate,
  DittoScanDetectionKind,
  DittoScanEnclosingContext,
} from "../types";

import { getClassificationVerdict } from "./index";

function buildInput(opts: {
  language: string;
  detectionKind?: DittoScanDetectionKind;
  parentRole?: DittoScanEnclosingContext["parentRole"];
  identifiers?: string[];
  callee?: string;
  calleeMember?: string;
  methodName?: string;
  parentTag?: string;
  framework?: string[];
  value?: string;
}) {
  const parentRole: DittoScanEnclosingContext["parentRole"] =
    opts.parentRole ?? opts.detectionKind ?? "other";
  const candidate: DittoScanCandidate = {
    id: "test",
    value_raw: opts.value ?? "Hello",
    detection_kind: opts.detectionKind ?? parentRole,
    location: { file: "x.ts", line: 1, column: 1 },
    language: opts.language,
    framework: opts.framework ?? [],
    source_context: "",
    context_identifiers: opts.identifiers ?? [],
    usage_evidence: null,
  };
  const context: DittoScanEnclosingContext = {
    parentRole,
    identifiers: opts.identifiers ?? [],
    callee: opts.callee,
    calleeMember: opts.calleeMember,
    methodName: opts.methodName,
    parentTag: opts.parentTag,
  };
  return { candidate, context };
}

describe("getClassificationVerdict - common accept rules", () => {
  test("resource_value: any localization-file entry accepts", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "ios_strings", detectionKind: "resource_value" })
    );
    expect(v).toEqual({ kind: "accept", rule: "resource_value" });
  });

  test("markup_attr_copy: copy-bearing attribute accepts", () => {
    const v = getClassificationVerdict(
      buildInput({
        language: "tsx",
        detectionKind: "markup_attr",
        identifiers: ["placeholder"],
      })
    );
    expect(v).toEqual({ kind: "accept", rule: "markup_attr_copy" });
  });

  test("markup_attr_copy: aria-label accepts", () => {
    const v = getClassificationVerdict(
      buildInput({
        language: "tsx",
        detectionKind: "markup_attr",
        identifiers: ["aria-label"],
      })
    );
    expect(v).toEqual({ kind: "accept", rule: "markup_attr_copy" });
  });

  test("markup_text_safe: text inside a copy-bearing tag accepts", () => {
    const v = getClassificationVerdict(
      buildInput({
        language: "tsx",
        detectionKind: "markup_text",
        parentTag: "button",
      })
    );
    expect(v).toEqual({ kind: "accept", rule: "markup_text_safe" });
  });

  test("markup_text_safe: text without a parentTag falls through to LLM", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "tsx", detectionKind: "markup_text" })
    );
    expect(v).toEqual({ kind: "llm" });
  });

  test("markup_text_safe: text inside a non-copy tag (`div`) falls through to LLM", () => {
    const v = getClassificationVerdict(
      buildInput({
        language: "tsx",
        detectionKind: "markup_text",
        parentTag: "div",
      })
    );
    expect(v).toEqual({ kind: "llm" });
  });
});

describe("getClassificationVerdict - javascript reject rules", () => {
  test("logger_call: console.log rejects across all JS family languages", () => {
    for (const lang of ["javascript", "typescript", "jsx", "tsx", "vue"]) {
      const v = getClassificationVerdict(
        buildInput({ language: lang, callee: "console", calleeMember: "log" })
      );
      expect(v).toEqual({ kind: "reject", rule: "logger_call" });
    }
  });

  test("non_text_call: bare JSON.parse / URL constructor rejects", () => {
    expect(
      getClassificationVerdict(buildInput({ language: "ts", callee: "URL" }))
    ).toEqual({ kind: "llm" });
    // `ts` isn't a registered RuleLanguage, so the JS reject rules don't fire.
    expect(
      getClassificationVerdict(
        buildInput({ language: "typescript", callee: "URL" })
      )
    ).toEqual({
      kind: "reject",
      rule: "non_text_call",
    });
    expect(
      getClassificationVerdict(
        buildInput({
          language: "typescript",
          callee: "JSON",
          calleeMember: "parse",
        })
      )
    ).toEqual({ kind: "reject", rule: "non_text_call" });
  });

  test("unknown callee falls through to LLM", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "typescript", callee: "someHelper" })
    );
    expect(v).toEqual({ kind: "llm" });
  });
});

describe("getClassificationVerdict - kotlin rules", () => {
  test("logger_call: Log.d rejects", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "kotlin", callee: "Log", calleeMember: "d" })
    );
    expect(v).toEqual({ kind: "reject", rule: "logger_call" });
  });

  test("logger_call: bare println rejects", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "kotlin", callee: "println" })
    );
    expect(v).toEqual({ kind: "reject", rule: "logger_call" });
  });

  test("runtime_fail: check(...) rejects", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "kotlin", callee: "check" })
    );
    expect(v).toEqual({ kind: "reject", rule: "runtime_fail" });
  });

  test("non_text_call: Pattern.compile rejects", () => {
    const v = getClassificationVerdict(
      buildInput({
        language: "kotlin",
        callee: "Pattern",
        calleeMember: "compile",
      })
    );
    expect(v).toEqual({ kind: "reject", rule: "non_text_call" });
  });

  test('compose_text: Text("...") accepts only with android framework token', () => {
    const withFramework = getClassificationVerdict(
      buildInput({ language: "kotlin", callee: "Text", framework: ["android"] })
    );
    expect(withFramework).toEqual({ kind: "accept", rule: "compose_text" });

    const withoutFramework = getClassificationVerdict(
      buildInput({ language: "kotlin", callee: "Text" })
    );
    expect(withoutFramework).toEqual({ kind: "llm" });
  });

  test("android_ui_factory: Toast.makeText and Snackbar.make accept", () => {
    const toast = getClassificationVerdict(
      buildInput({
        language: "kotlin",
        callee: "Toast",
        calleeMember: "makeText",
      })
    );
    expect(toast).toEqual({ kind: "accept", rule: "android_ui_factory" });

    const snack = getClassificationVerdict(
      buildInput({
        language: "kotlin",
        callee: "Snackbar",
        calleeMember: "make",
      })
    );
    expect(snack).toEqual({ kind: "accept", rule: "android_ui_factory" });
  });
});

describe("getClassificationVerdict - swift rules", () => {
  test("logger_call: print, NSLog, os_log, debugPrint all reject", () => {
    for (const callee of ["print", "NSLog", "os_log", "debugPrint"]) {
      const v = getClassificationVerdict(
        buildInput({ language: "swift", callee })
      );
      expect(v).toEqual({ kind: "reject", rule: "logger_call" });
    }
  });

  test("runtime_fail: fatalError, assert, precondition reject", () => {
    for (const callee of ["fatalError", "assert", "precondition"]) {
      const v = getClassificationVerdict(
        buildInput({ language: "swift", callee })
      );
      expect(v).toEqual({ kind: "reject", rule: "runtime_fail" });
    }
  });

  test("non_text_call: URL/NSURL reject", () => {
    expect(
      getClassificationVerdict(buildInput({ language: "swift", callee: "URL" }))
    ).toEqual({
      kind: "reject",
      rule: "non_text_call",
    });
    expect(
      getClassificationVerdict(
        buildInput({ language: "swift", callee: "NSURL" })
      )
    ).toEqual({
      kind: "reject",
      rule: "non_text_call",
    });
  });

  test("Swift has no language-specific accept rules; UI calls fall through to LLM", () => {
    const v = getClassificationVerdict(
      buildInput({
        language: "swift",
        callee: "button",
        calleeMember: "setTitle",
      })
    );
    expect(v).toEqual({ kind: "llm" });
  });
});

describe("getClassificationVerdict - dispatch ordering", () => {
  test("reject wins over a common accept on the same candidate", () => {
    // Forces resource_value (would accept) on a Log.d call (rejects). Reject must run first.
    const v = getClassificationVerdict(
      buildInput({
        language: "kotlin",
        detectionKind: "resource_value",
        callee: "Log",
        calleeMember: "d",
      })
    );
    expect(v).toEqual({ kind: "reject", rule: "logger_call" });
  });

  test("language-specific reject wins over common reject (empty common is a no-op here)", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "swift", callee: "print" })
    );
    expect(v.kind).toBe("reject");
  });

  test("language-specific accept wins over common accept", () => {
    // Candidate matches both markup_text_safe (common) and compose_text (kotlin). Lang must win.
    const v = getClassificationVerdict(
      buildInput({
        language: "kotlin",
        parentRole: "markup_text",
        parentTag: "button",
        callee: "Text",
        framework: ["android"],
      })
    );
    expect(v).toEqual({ kind: "accept", rule: "compose_text" });
  });

  test("unknown language has no language rules; falls through to common", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "python", detectionKind: "resource_value" })
    );
    expect(v).toEqual({ kind: "accept", rule: "resource_value" });
  });

  test("non-RuleLanguage key (like prototype `constructor`) does not crash and returns llm", () => {
    const v = getClassificationVerdict(buildInput({ language: "constructor" }));
    expect(v).toEqual({ kind: "llm" });
  });

  test("no rule matches: returns llm", () => {
    const v = getClassificationVerdict(
      buildInput({ language: "typescript", value: "Some plain string" })
    );
    expect(v).toEqual({ kind: "llm" });
  });
});
