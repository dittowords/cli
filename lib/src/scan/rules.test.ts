import type { DittoScanEnclosingContext } from "./types";

import { shouldEmit } from "./rules";

const other: DittoScanEnclosingContext = {
  parentRole: "other",
  identifiers: [],
};
const markupText: DittoScanEnclosingContext = {
  parentRole: "markup_text",
  identifiers: [],
  parentTag: "p",
};
const markupAttr = (name: string): DittoScanEnclosingContext => ({
  parentRole: "markup_attr",
  identifiers: [name],
});
const role = (
  parentRole: DittoScanEnclosingContext["parentRole"]
): DittoScanEnclosingContext => ({ parentRole, identifiers: [] });

describe("shouldEmit", () => {
  test("accepts normal user-facing copy", () => {
    expect(shouldEmit("Save changes", other)).toBe(true);
    expect(shouldEmit("Welcome back", markupText)).toBe(true);
  });

  test("rejects strings shorter than the minimum length", () => {
    expect(shouldEmit("", other)).toBe(false);
    expect(shouldEmit("a", other)).toBe(false);
    expect(shouldEmit("ok", other)).toBe(true);
  });

  test("strips one wrapping pair of source quotes before shape checks", () => {
    expect(shouldEmit('"https://example.com"', other)).toBe(false);
    expect(shouldEmit("'https://example.com'", other)).toBe(false);
    expect(shouldEmit("`https://example.com`", other)).toBe(false);
  });

  test("rejects URLs and URI-scheme tokens", () => {
    expect(shouldEmit("https://example.com", other)).toBe(false);
    expect(shouldEmit("mailto:hi@example.com", other)).toBe(false);
    expect(shouldEmit("data:image/png;base64,abc", other)).toBe(false);
  });

  test("rejects file paths", () => {
    expect(shouldEmit("./components/button.tsx", other)).toBe(false);
    expect(shouldEmit("../shared/utils", other)).toBe(false);
    expect(shouldEmit("/usr/local/bin/node", other)).toBe(false);
    expect(shouldEmit("github.com/foo/bar", other)).toBe(false);
  });

  test("rejects UUIDs, hex colors, and version strings", () => {
    expect(shouldEmit("550e8400-e29b-41d4-a716-446655440000", other)).toBe(
      false
    );
    expect(shouldEmit("#ff00aa", other)).toBe(false);
    expect(shouldEmit("v1.2.3-beta.1", other)).toBe(false);
  });

  test("keeps short English words that happen to be hex-shaped", () => {
    // 4-char tokens without `#` should not be filtered (else "dead", "face", "cafe" get lost).
    expect(shouldEmit("dead", other)).toBe(true);
    expect(shouldEmit("cafe", other)).toBe(true);
  });

  test("rejects pure punctuation/whitespace", () => {
    expect(shouldEmit("...", other)).toBe(false);
    expect(shouldEmit("---", other)).toBe(false);
    expect(shouldEmit("  ", other)).toBe(false);
  });

  test("rejects format-directive-only strings but keeps copy that contains a directive", () => {
    expect(shouldEmit("%@", other)).toBe(false);
    expect(shouldEmit("%#@items@", other)).toBe(false);
    expect(shouldEmit("%1$#@count@", other)).toBe(false);
    expect(shouldEmit("%d items", other)).toBe(true);
    expect(shouldEmit("%#@count@ remaining", other)).toBe(true);
  });

  test("rejects bare Vue/Angular interpolation but keeps interpolation with a literal fallback", () => {
    expect(shouldEmit("{{ title }}", other)).toBe(false);
    expect(shouldEmit("{{ user.name }}", other)).toBe(false);
    expect(shouldEmit("{{ x ?? 'fallback text' }}", other)).toBe(true);
  });

  test("rejects parentRoles in the excluded set", () => {
    expect(shouldEmit("foo", role("import"))).toBe(false);
    expect(shouldEmit("foo", role("regex_pattern"))).toBe(false);
    expect(shouldEmit("foo", role("object_key"))).toBe(false);
    expect(shouldEmit("foo", role("index_access"))).toBe(false);
    expect(shouldEmit("foo", role("type_tag"))).toBe(false);
  });

  test("rejects markup_attr values on structural/identifying attributes", () => {
    expect(shouldEmit("primary", markupAttr("className"))).toBe(false);
    expect(shouldEmit("#root", markupAttr("id"))).toBe(false);
    expect(shouldEmit("submit", markupAttr("data-testid"))).toBe(false);
    expect(shouldEmit("true", markupAttr("aria-hidden"))).toBe(false);
  });

  test("keeps markup_attr values on copy-bearing attributes (handled by accept rule downstream)", () => {
    expect(shouldEmit("Email address", markupAttr("placeholder"))).toBe(true);
    expect(shouldEmit("Close dialog", markupAttr("aria-label"))).toBe(true);
  });
});
