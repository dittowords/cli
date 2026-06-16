import { androidResourceExtractor } from "./android-resources";

const extract = (source: string) => androidResourceExtractor.extract({ source, kind: "android_resources" });

describe("androidResourceExtractor", () => {
  test("emits <string> values keyed by name", async () => {
    const source = [
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<resources>`,
      `  <string name="hello">Hello, world!</string>`,
      `  <string name="goodbye">Goodbye</string>`,
      `</resources>`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => ({ v: h.value, ids: h.context.identifiers }))).toEqual([
      { v: "Hello, world!", ids: ["hello"] },
      { v: "Goodbye", ids: ["goodbye"] },
    ]);
    expect(hits[0].context.parentRole).toBe("resource_value");
  });

  test("emits one hit per <plurals> item, tagged with the quantity", async () => {
    const source = [
      `<resources>`,
      `  <plurals name="items">`,
      `    <item quantity="one">%d item</item>`,
      `    <item quantity="other">%d items</item>`,
      `  </plurals>`,
      `</resources>`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits).toHaveLength(2);
    expect(hits[0].context.identifiers).toEqual(["items", "one"]);
    expect(hits[1].context.identifiers).toEqual(["items", "other"]);
  });

  test("emits one hit per <string-array> item, indexed numerically", async () => {
    const source = [
      `<resources>`,
      `  <string-array name="planets">`,
      `    <item>Mercury</item>`,
      `    <item>Venus</item>`,
      `  </string-array>`,
      `</resources>`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => h.value)).toEqual(["Mercury", "Venus"]);
    expect(hits[0].context.identifiers).toEqual(["planets", "0"]);
    expect(hits[1].context.identifiers).toEqual(["planets", "1"]);
  });

  test("recovers CDATA-wrapped values via the regex sweep", async () => {
    const source = [
      `<resources>`,
      `  <string name="welcome"><![CDATA[<b>Welcome</b>]]></string>`,
      `</resources>`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    const welcome = hits.find((h) => h.value === "<b>Welcome</b>");
    expect(welcome).toBeDefined();
    expect(welcome?.context.identifiers).toEqual(["welcome"]);
  });
});
