// Side-effect import: registers the dynamic Kotlin grammar with ast-grep.
import "../registry";

import { kotlinExtractor } from "./kotlin";

const extract = (source: string) => kotlinExtractor.extract({ source, kind: "kotlin" });

describe("kotlinExtractor", () => {
  test("equality and `when` arms are type_tag", async () => {
    const source = [
      `fun f(x: String): Int {`,
      `  if (x == "foo") return 1`,
      `  return when (x) { "bar" -> 2; else -> 0 }`,
      `}`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    const foo = hits.find((h) => h.value === '"foo"');
    const bar = hits.find((h) => h.value === '"bar"');
    expect(foo?.context.parentRole).toBe("type_tag");
    expect(bar?.context.parentRole).toBe("type_tag");
  });

  test('mapOf `"k" to v` marks the left operand as object_key', async () => {
    const source = `val m = mapOf("alpha" to 1, "beta" to 2)\n`;
    const hits = await extract(source);
    const alpha = hits.find((h) => h.value === '"alpha"');
    expect(alpha?.context.parentRole).toBe("object_key");
  });

  test("Regex constructor argument is regex_pattern", async () => {
    const hits = await extract(`val r = Regex("^foo$")\n`);
    const pat = hits.find((h) => h.value === '"^foo$"');
    expect(pat?.context.parentRole).toBe("regex_pattern");
  });

  test("captures callee/calleeMember/methodName for known call shapes", async () => {
    const source = [
      `fun f() {`,
      `  println("a")`,
      `  Log.d(TAG, "b")`,
      `  AlertDialog.Builder(ctx).setTitle("c")`,
      `}`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    const a = hits.find((h) => h.value === '"a"');
    const b = hits.find((h) => h.value === '"b"');
    const c = hits.find((h) => h.value === '"c"');
    expect(a?.context).toMatchObject({ parentRole: "other", callee: "println" });
    expect(b?.context).toMatchObject({ parentRole: "other", callee: "Log", calleeMember: "d", methodName: "d" });
    expect(c?.context).toMatchObject({ parentRole: "other", methodName: "setTitle" });
    expect(c?.context.callee).toBeUndefined();
  });
});

// From a pilot bug report: the escape shipped to users as the literal text `\n`.
describe("kotlinExtractor escape decoding", () => {
  const extract = (source: string) => kotlinExtractor.extract({ source, kind: "kotlin" });

  it("decodes escapes in a Compose string", async () => {
    const hits = await extract(
      'fun S() { Text(text = "We need your phone number to provide\\nstatus updates") }'
    );
    expect(hits[0].value).toBe('"We need your phone number to provide\nstatus updates"');
  });

  // Raw strings don't process escapes, so a `\n` in one is two real characters.
  it("leaves a raw string's escapes alone", async () => {
    const hits = await extract('val s = """a\\nb"""');
    expect(hits[0].value).toBe('"""a\\nb"""');
  });
});
