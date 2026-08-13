import "../registry";

import { swiftExtractor } from "./swift";

const extract = (source: string) => swiftExtractor.extract({ source, kind: "swift" });

describe("swiftExtractor", () => {
  test("equality and switch case patterns are type_tag", async () => {
    const source = [
      `func f(x: String) -> Int {`,
      `  if x == "foo" { return 1 }`,
      `  switch x { case "bar": return 2; default: return 0 }`,
      `}`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits.find((h) => h.value === '"foo"')?.context.parentRole).toBe("type_tag");
    expect(hits.find((h) => h.value === '"bar"')?.context.parentRole).toBe("type_tag");
  });

  test("enum raw values and attribute arguments are type_tag", async () => {
    const source = [`enum E: String { case a = "alpha"; case b = "beta" }`, `@objc("Bridged") class C {}`, ``].join(
      "\n"
    );
    const hits = await extract(source);
    expect(hits.find((h) => h.value === '"alpha"')?.context.parentRole).toBe("type_tag");
    expect(hits.find((h) => h.value === '"Bridged"')?.context.parentRole).toBe("type_tag");
  });

  test("dictionary keys are object_key, values are other", async () => {
    const hits = await extract(`let d = ["k": "v"]\n`);
    const k = hits.find((h) => h.value === '"k"');
    const v = hits.find((h) => h.value === '"v"');
    expect(k?.context.parentRole).toBe("object_key");
    expect(v?.context.parentRole).toBe("other");
  });

  test("NSRegularExpression and Regex arguments are regex_pattern", async () => {
    const hits = await extract(`let r = Regex("^foo$")\nlet n = NSRegularExpression(pattern: "bar")\n`);
    expect(hits.find((h) => h.value === '"^foo$"')?.context.parentRole).toBe("regex_pattern");
    expect(hits.find((h) => h.value === '"bar"')?.context.parentRole).toBe("regex_pattern");
  });

  test("captures callee/methodName for call expressions", async () => {
    const source = [`func f() {`, `  print("a")`, `  button.setTitle("b", for: .normal)`, `}`, ``].join("\n");
    const hits = await extract(source);
    expect(hits.find((h) => h.value === '"a"')?.context).toMatchObject({ parentRole: "other", callee: "print" });
    expect(hits.find((h) => h.value === '"b"')?.context).toMatchObject({
      parentRole: "other",
      callee: "button",
      calleeMember: "setTitle",
      methodName: "setTitle",
    });
  });
});

describe("swiftExtractor escape decoding", () => {
  test("decodes escapes", async () => {
    const hits = await extract(`let a = "line one\\nline two"\n`);
    expect(hits[0].value).toBe('"line one\nline two"');
  });

  // Raw strings (`#"..."#`) don't process escapes.
  test("leaves a raw string's escapes alone", async () => {
    const hits = await extract(`let a = #"a\\nb"#\n`);
    expect(hits[0].value).toBe('#"a\\nb"#');
  });
});
