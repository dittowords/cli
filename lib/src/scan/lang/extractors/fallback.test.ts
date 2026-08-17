import { fallbackExtractor } from "./fallback";

const extract = (source: string) => fallbackExtractor.extract({ source, kind: "regex_fallback" });

describe("fallbackExtractor", () => {
  test("emits one hit per quoted literal with 1-based line/column", async () => {
    const hits = await extract(`const greeting = "Hello, world";\n`);
    expect(hits).toEqual([
      {
        value: "Hello, world",
        snapshotText: `"Hello, world"`,
        location: { line: 1, column: 18 },
        context: { parentRole: "other", identifiers: [] },
      },
    ]);
  });

  test("handles single, double, and backtick quotes", async () => {
    const hits = await extract(`x = "a"\ny = 'b'\nz = \`c\`\n`);
    expect(hits.map((h) => h.value)).toEqual(["a", "b", "c"]);
    expect(hits.map((h) => h.location.line)).toEqual([1, 2, 3]);
  });

  test("emits multiple literals on the same line", async () => {
    const hits = await extract(`pair("a", "b")\n`);
    expect(hits).toHaveLength(2);
    expect(hits[0].value).toBe("a");
    expect(hits[1].value).toBe("b");
    expect(hits[0].location.column).toBeLessThan(hits[1].location.column);
  });

  test("respects escaped quotes inside a literal", async () => {
    const hits = await extract(`msg = "He said \\"hi\\""\n`);
    expect(hits).toHaveLength(1);
    expect(hits[0].value).toBe('He said \\"hi\\"');
  });

  test("returns an empty array when no literals are present", async () => {
    const hits = await extract(`const x = 42;\n// no strings here\n`);
    expect(hits).toEqual([]);
  });
});
