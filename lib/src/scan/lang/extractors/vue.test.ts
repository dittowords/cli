import { vueExtractor } from "./vue";

const extract = (source: string) => vueExtractor.extract({ source, kind: "vue" });

describe("vueExtractor", () => {
  test("emits template text as markup_text and script literals as other", async () => {
    const source = [
      `<template>`,
      `  <p>Hello world</p>`,
      `</template>`,
      `<script lang="ts">`,
      `  const greeting = "Hi from script";`,
      `</script>`,
      ``,
    ].join("\n");
    const hits = await extract(source);

    const hello = hits.find((h) => h.value.trim() === "Hello world");
    expect(hello?.context.parentRole).toBe("markup_text");
    expect(hello?.context.parentTag).toBe("p");

    const fromScript = hits.find((h) => h.value === '"Hi from script"');
    expect(fromScript?.context.parentRole).toBe("other");
  });

  test("script positions are reported against the original .vue file", async () => {
    const source = [`<template><p>Hi</p></template>`, `<script>`, `const s = "row2";`, `</script>`, ``].join("\n");
    const hits = await extract(source);
    const fromScript = hits.find((h) => h.value === '"row2"');
    expect(fromScript?.location.line).toBe(3);
  });

  test("ignores <style> contents", async () => {
    const source = [`<template><p>Visible</p></template>`, `<style>.x::after { content: "hidden"; }</style>`, ``].join(
      "\n"
    );
    const hits = await extract(source);
    const values = hits.map((h) => h.value.trim());
    expect(values).toContain("Visible");
    expect(values).not.toContain("hidden");
  });

  test("returns empty array for an empty SFC", async () => {
    const hits = await extract(`<template></template>\n<script></script>\n`);
    expect(hits).toEqual([]);
  });
});
