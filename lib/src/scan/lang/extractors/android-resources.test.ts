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

// The main <string> path. An earlier version of this fix only reached the CDATA
// sweep and silently did nothing here.
describe("androidResourceExtractor escape decoding", () => {
  const extract = (source: string) =>
    androidResourceExtractor.extract({ source, kind: "android_resources" });

  it("decodes escapes in a <string>", async () => {
    const hits = await extract(
      `<resources><string name="a">line one\\nline two</string></resources>`
    );
    expect(hits.map((h) => h.value)).toEqual(["line one\nline two"]);
  });

  it("decodes escapes inside <plurals> items", async () => {
    const hits = await extract(
      `<resources>
         <plurals name="n">
           <item quantity="one">one\\nfile</item>
           <item quantity="other">many\\nfiles</item>
         </plurals>
       </resources>`
    );
    expect(hits.map((h) => h.value)).toEqual(["one\nfile", "many\nfiles"]);
  });
});

// Ditto wraps placeholders in <xliff:g>. Only the first text child used to survive,
// so the copy stopped at the first placeholder and every variable disappeared.
describe("androidResourceExtractor inline markup", () => {
  const extract = (source: string) => androidResourceExtractor.extract({ source, kind: "android_resources" });

  it("keeps the text and the specifiers around an <xliff:g>", async () => {
    const hits = await extract(
      `<resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
         <string name="hint">We sent it to <xliff:g id="phone" example="(555) 555-555">%1$s</xliff:g>. It expires in <xliff:g id="mins" example="10">%2$s</xliff:g> minutes.</string>
       </resources>`
    );
    expect(hits.map((h) => h.value)).toEqual(["We sent it to %1$s. It expires in %2$s minutes."]);
  });

  it("keeps each plural item distinct", async () => {
    const hits = await extract(
      `<resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
         <plurals name="hint">
           <item quantity="one">Expires in <xliff:g id="m">%1$s</xliff:g> minute.</item>
           <item quantity="other">Expires in <xliff:g id="m">%1$s</xliff:g> minutes.</item>
         </plurals>
       </resources>`
    );
    expect(hits.map((h) => ({ v: h.value, ids: h.context.identifiers }))).toEqual([
      { v: "Expires in %1$s minute.", ids: ["hint", "one"] },
      { v: "Expires in %1$s minutes.", ids: ["hint", "other"] },
    ]);
  });

  it("keeps the words inside an inline style tag", async () => {
    const hits = await extract(`<resources><string name="a">Please <b>do not</b> share it</string></resources>`);
    expect(hits.map((h) => h.value)).toEqual(["Please do not share it"]);
  });

  it("decodes XML entities", async () => {
    const hits = await extract(`<resources><string name="a">&lt;- Back &amp; forth</string></resources>`);
    expect(hits.map((h) => h.value)).toEqual(["<- Back & forth"]);
  });
});
