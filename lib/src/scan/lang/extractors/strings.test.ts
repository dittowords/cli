import { stringsExtractor } from "./strings";

const extract = (source: string) => stringsExtractor.extract({ source, kind: "ios_strings" });

describe("stringsExtractor (.strings)", () => {
  test("emits one resource_value per key=value pair", async () => {
    const hits = await extract(`"greeting" = "Hello, world";\n"farewell" = "Goodbye";\n`);
    expect(hits).toEqual([
      {
        value: "Hello, world",
        location: { line: 1, column: 14 },
        context: { parentRole: "resource_value", identifiers: ["greeting"] },
      },
      {
        value: "Goodbye",
        location: { line: 2, column: 14 },
        context: { parentRole: "resource_value", identifiers: ["farewell"] },
      },
    ]);
  });

  test("skips // line comments and /* block comments */", async () => {
    const source = [
      `// header`,
      `/* multi`,
      `   line comment */`,
      `"a" = "alpha";`,
      `// trailing`,
      `"b" = "beta";`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => h.value)).toEqual(["alpha", "beta"]);
    expect(hits.map((h) => h.context.identifiers[0])).toEqual(["a", "b"]);
  });

  test("preserves escape sequences verbatim in value", async () => {
    const hits = await extract(`"k" = "line1\\nline2 with \\"quote\\"";\n`);
    expect(hits).toHaveLength(1);
    expect(hits[0].value).toBe('line1\\nline2 with \\"quote\\"');
  });

  test("returns no hits for malformed input", async () => {
    const hits = await extract(`this is not a strings file\n`);
    expect(hits).toEqual([]);
  });

  test("handles missing trailing semicolon", async () => {
    const hits = await extract(`"k" = "v"\n"k2" = "v2";\n`);
    expect(hits.map((h) => h.value)).toEqual(["v", "v2"]);
  });
});
