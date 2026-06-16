import { Lang } from "@ast-grep/napi";

import { javascriptExtractor } from "./javascript";

const ts = javascriptExtractor(Lang.TypeScript);
const tsx = javascriptExtractor(Lang.Tsx);

describe("javascriptExtractor", () => {
  test("tags import paths as `import` and bare module argv too", async () => {
    const hits = await ts.extract({ source: `import x from "y";\nrequire("z");\n`, kind: "typescript" });
    const roles = hits.map((h) => h.context.parentRole);
    expect(roles).toEqual(["import", "import"]);
  });

  test("tags `new RegExp(...)` arg as regex_pattern", async () => {
    const hits = await ts.extract({ source: `const r = new RegExp("^foo$");\n`, kind: "typescript" });
    const re = hits.find((h) => h.value === '"^foo$"');
    expect(re?.context.parentRole).toBe("regex_pattern");
  });

  test("tags object keys as object_key and values as other", async () => {
    const hits = await ts.extract({ source: `const o = { "label": "Hello" };\n`, kind: "typescript" });
    const label = hits.find((h) => h.value === '"label"');
    const hello = hits.find((h) => h.value === '"Hello"');
    expect(label?.context.parentRole).toBe("object_key");
    expect(hello?.context.parentRole).toBe("other");
  });

  test("tags switch cases and equality checks as type_tag", async () => {
    const source = `function f(x: string) {\n  if (x === "foo") return 1;\n  switch (x) { case "bar": return 2; }\n  return 0;\n}\n`;
    const hits = await ts.extract({ source, kind: "typescript" });
    const foo = hits.find((h) => h.value === '"foo"');
    const bar = hits.find((h) => h.value === '"bar"');
    expect(foo?.context.parentRole).toBe("type_tag");
    expect(bar?.context.parentRole).toBe("type_tag");
  });

  test("captures callee/calleeMember for member-expression calls", async () => {
    const hits = await ts.extract({ source: `console.log("hi");\nt("welcome");\n`, kind: "typescript" });
    const hi = hits.find((h) => h.value === '"hi"');
    const welcome = hits.find((h) => h.value === '"welcome"');
    expect(hi?.context).toMatchObject({ parentRole: "other", callee: "console", calleeMember: "log" });
    expect(welcome?.context).toMatchObject({ parentRole: "other", callee: "t" });
    expect(welcome?.context.calleeMember).toBeUndefined();
  });

  test("emits jsx_text as markup_text with the enclosing tag", async () => {
    const hits = await tsx.extract({
      source: `const e = <button>Save</button>;\n`,
      kind: "tsx",
    });
    const save = hits.find((h) => h.value.trim() === "Save");
    expect(save?.context.parentRole).toBe("markup_text");
    expect(save?.context.parentTag).toBe("button");
  });

  test("emits JSX attribute string as markup_attr with attribute name in identifiers", async () => {
    const hits = await tsx.extract({
      source: `const e = <input placeholder="Email" />;\n`,
      kind: "tsx",
    });
    const email = hits.find((h) => h.value === '"Email"');
    expect(email?.context.parentRole).toBe("markup_attr");
    expect(email?.context.identifiers).toEqual(["placeholder"]);
  });

  test("suppresses parentTag inside code-shaped JSX ancestors", async () => {
    const hits = await tsx.extract({
      source: `const e = <pre><span>npm install</span></pre>;\n`,
      kind: "tsx",
    });
    const inner = hits.find((h) => h.value.trim() === "npm install");
    expect(inner?.context.parentRole).toBe("markup_text");
    expect(inner?.context.parentTag).toBeUndefined();
  });
});
