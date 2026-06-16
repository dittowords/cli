import { jsonI18nExtractor } from "./json-i18n";

const extract = (source: string) => jsonI18nExtractor.extract({ source, kind: "json_i18n" });

describe("jsonI18nExtractor", () => {
  test("emits flat key/value pairs with the key in identifiers", async () => {
    const source = JSON.stringify({ "home.title": "Welcome", "home.subtitle": "Sign in" }, null, 2);
    const hits = await extract(source);
    expect(hits.map((h) => ({ v: h.value, ids: h.context.identifiers }))).toEqual([
      { v: "Welcome", ids: ["home.title"] },
      { v: "Sign in", ids: ["home.subtitle"] },
    ]);
    expect(hits.every((h) => h.context.parentRole === "resource_value")).toBe(true);
  });

  test("descends into nested objects, accumulating the key path", async () => {
    const source = JSON.stringify({ labels: { paste: "Paste", copy: "Copy" } }, null, 2);
    const hits = await extract(source);
    expect(hits.map((h) => h.context.identifiers)).toEqual([
      ["labels", "paste"],
      ["labels", "copy"],
    ]);
  });

  test("splits `_one` / `_other` suffix into [base, variant]", async () => {
    const source = JSON.stringify({ item_one: "1 item", item_other: "{count} items" }, null, 2);
    const hits = await extract(source);
    expect(hits.map((h) => h.context.identifiers)).toEqual([
      ["item", "one"],
      ["item", "other"],
    ]);
  });

  test("nested plural form keeps the explicit identifier path", async () => {
    const source = JSON.stringify({ item: { one: "1 item", other: "{count} items" } }, null, 2);
    const hits = await extract(source);
    expect(hits.map((h) => h.context.identifiers)).toEqual([
      ["item", "one"],
      ["item", "other"],
    ]);
  });

  test("emits ICU-shaped values as a single candidate", async () => {
    const source = JSON.stringify({ item: "{count, plural, one {# item} other {# items}}" }, null, 2);
    const hits = await extract(source);
    expect(hits).toHaveLength(1);
    expect(hits[0].value).toBe("{count, plural, one {# item} other {# items}}");
  });

  test("skips empty values and non-string leaves", async () => {
    const source = JSON.stringify({ a: "", b: "  ", c: 42, d: true, e: null, f: "real" });
    const hits = await extract(source);
    expect(hits.map((h) => h.value)).toEqual(["real"]);
  });

  test("returns empty for invalid JSON or a non-object root", async () => {
    expect(await extract(`not json`)).toEqual([]);
    expect(await extract(`["a", "b"]`)).toEqual([]);
  });

  test("i18nKey is the literal dot-joined key path", async () => {
    const source = JSON.stringify(
      { "home.title": "Welcome", labels: { paste: "Paste" } },
      null,
      2
    );
    const hits = await extract(source);
    expect(hits.map((h) => h.i18nKey)).toEqual(["home.title", "labels.paste"]);
  });

  test("i18nKey keeps the plural suffix that identifiers split off", async () => {
    const source = JSON.stringify({ item_one: "1 item", item_other: "{count} items" }, null, 2);
    const hits = await extract(source);
    expect(hits.map((h) => h.i18nKey)).toEqual(["item_one", "item_other"]);
  });
});
