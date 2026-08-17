// Side-effect import: registers the dynamic Kotlin and Swift grammars.
import "../registry";

import { Lang } from "@ast-grep/napi";

import { fallbackExtractor } from "./fallback";
import { htmlMarkupExtractor } from "./html-markup";
import { javascriptExtractor } from "./javascript";
import { kotlinExtractor } from "./kotlin";
import { swiftExtractor } from "./swift";
import { vueExtractor } from "./vue";
import type { LanguageExtractor } from "../types";

const cases: {
  name: string;
  extractor: LanguageExtractor;
  kind: string;
  source: string;
}[] = [
  {
    name: "javascript",
    extractor: javascriptExtractor(Lang.Tsx),
    kind: "tsx",
    source: `
      const re = "^foo$";
      const apostrophe = 'Don\\'t stop';
      const tabbed = "Line one\\nLine two";
      const tpl = \`Hi \${name}, welcome back\`;
      export const View = () => (
        <div title="Save changes">
          Read the <a href="/docs">docs</a> first
        </div>
      );
    `,
  },
  {
    name: "html-markup",
    extractor: htmlMarkupExtractor,
    kind: "html",
    source: `
      <p>Welcome home</p>
      <img alt="A cat wearing a hat" src="/cat.png" />
      <span>{{ isFollowing ? 'Unfollow' : 'Follow' }}</span>
    `,
  },
  {
    name: "vue",
    extractor: vueExtractor,
    kind: "vue",
    source: `
      <template>
        <p>Welcome home</p>
      </template>
      <script>
      export default { data: () => ({ label: "Save changes" }) };
      </script>
    `,
  },
  {
    name: "kotlin",
    extractor: kotlinExtractor,
    kind: "kotlin",
    source: `
      val greeting = "Don't stop\\nnow"
      val raw = """Multi
      line"""
    `,
  },
  {
    name: "swift",
    extractor: swiftExtractor,
    kind: "swift",
    source: `
      let greeting = "Don't stop\\nnow"
      let raw = #"Keep \\n literal"#
    `,
  },
  {
    name: "fallback",
    extractor: fallbackExtractor,
    kind: "python",
    source: `
      greeting = "Don't stop"
      other = 'Save changes'
    `,
  },
];

describe.each(cases)("$name snapshotText", ({ extractor, kind, source }) => {
  test("is present on every hit", async () => {
    const hits = await extractor.extract({ source, kind });

    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(typeof hit.snapshotText).toBe("string");
    }
  });

  test("can be found verbatim in the source", async () => {
    const hits = await extractor.extract({ source, kind });

    for (const hit of hits) {
      expect(source).toContain(hit.snapshotText);
    }
  });
});

describe("snapshotText keeps what the value drops", () => {
  const tsx = javascriptExtractor(Lang.Tsx);

  test("keeps escape sequences the value decodes", async () => {
    const source = `const message = "Line one\\nLine two";`;
    const hits = await tsx.extract({ source, kind: "tsx" });
    const hit = hits.find((h) => h.value.includes("Line one"));

    expect(hit?.value).toContain("\n");
    expect(hit?.snapshotText).toBe('"Line one\\nLine two"');
  });

  test("keeps the original quote style", async () => {
    const source = `const a = 'Save changes';`;
    const hits = await tsx.extract({ source, kind: "tsx" });

    expect(hits[0]?.snapshotText).toBe("'Save changes'");
  });

  test("keeps the interpolation expression in a template literal", async () => {
    const source = "const a = `Hi ${firstName}, welcome`;";
    const hits = await tsx.extract({ source, kind: "tsx" });

    expect(hits[0]?.snapshotText).toBe("`Hi ${firstName}, welcome`");
  });

  test("keeps inline markup inside a JSX text run", async () => {
    const source = `const a = <p>Read the <b>docs</b> first</p>;`;
    const hits = await tsx.extract({ source, kind: "tsx" });
    const run = hits.find((h) => h.value.includes("Read the"));

    expect(run?.snapshotText).toBe("Read the ");
  });
});
