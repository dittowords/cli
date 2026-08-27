import { ZJSONOutput } from "./json";

describe("ZJSONOutput", () => {
  it("accepts a plain json output with no framework", () => {
    const result = ZJSONOutput.safeParse({ format: "json" });
    expect(result.success).toBe(true);
  });

  it("accepts framework: icu", () => {
    const result = ZJSONOutput.safeParse({ format: "json", framework: "icu" });
    expect(result.success).toBe(true);
  });

  it("accepts framework: arb", () => {
    const result = ZJSONOutput.safeParse({ format: "json", framework: "arb" });
    expect(result.success).toBe(true);
  });

  it("accepts framework: i18next with a type", () => {
    const result = ZJSONOutput.safeParse({
      format: "json",
      framework: "i18next",
      type: "module",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a type field on framework: icu", () => {
    const result = ZJSONOutput.safeParse({
      format: "json",
      framework: "icu",
      type: "module",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a type field on framework: arb", () => {
    const result = ZJSONOutput.safeParse({
      format: "json",
      framework: "arb",
      type: "module",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown framework", () => {
    const result = ZJSONOutput.safeParse({
      format: "json",
      framework: "not-a-real-framework",
    });
    expect(result.success).toBe(false);
  });
});
