import { decodeEscapes } from "./util";

describe("decodeEscapes", () => {
  it("decodes newlines, tabs and quotes", () => {
    expect(decodeEscapes("line one\\nline two")).toBe("line one\nline two");
    expect(decodeEscapes("a\\tb")).toBe("a\tb");
    expect(decodeEscapes('say \\"hi\\"')).toBe('say "hi"');
    expect(decodeEscapes("it\\'s")).toBe("it's");
  });

  it("decodes unicode escapes", () => {
    expect(decodeEscapes("5 \\u2605")).toBe("5 ★");
  });

  // A doubled backslash means the author wanted a real backslash, so it must not
  // become a newline.
  it("keeps an intentional literal backslash-n", () => {
    expect(decodeEscapes("use \\\\n for a break")).toBe("use \\n for a break");
  });

  // Android escapes `?` and `@` on export, because a resource value that starts
  // with one is a reference. The copy holds the bare character.
  it("drops the backslash before escaped punctuation", () => {
    expect(decodeEscapes("Forgot Password\\?")).toBe("Forgot Password?");
    expect(decodeEscapes("\\@ home")).toBe("@ home");
    expect(decodeEscapes("100\\% sure")).toBe("100% sure");
  });

  it("leaves an escaped letter alone", () => {
    expect(decodeEscapes("match \\d digits")).toBe("match \\d digits");
  });
});
