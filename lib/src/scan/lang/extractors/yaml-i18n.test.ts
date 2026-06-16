import { yamlI18nExtractor } from "./yaml-i18n";

const extract = (source: string) => yamlI18nExtractor.extract({ source, kind: "yaml_i18n" });

describe("yamlI18nExtractor", () => {
  test("walks nested maps and emits each leaf string", async () => {
    const source = [`en:`, `  greetings:`, `    hello: Hello`, `    bye: Goodbye`, ``].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => ({ v: h.value, ids: h.context.identifiers }))).toEqual([
      { v: "Hello", ids: ["en", "greetings", "hello"] },
      { v: "Goodbye", ids: ["en", "greetings", "bye"] },
    ]);
    expect(hits.every((h) => h.context.parentRole === "resource_value")).toBe(true);
  });

  test("indexes sequence items numerically", async () => {
    const source = [`en:`, `  planets:`, `    - Mercury`, `    - Venus`, ``].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => h.context.identifiers)).toEqual([
      ["en", "planets", "0"],
      ["en", "planets", "1"],
    ]);
  });

  test("splits `_one` / `_other` plural suffix in the trailing key", async () => {
    const source = [`en:`, `  item_one: "1 item"`, `  item_other: "{count} items"`, ``].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => h.context.identifiers)).toEqual([
      ["en", "item", "one"],
      ["en", "item", "other"],
    ]);
  });

  test("skips empty and non-string scalars", async () => {
    const source = [`en:`, `  count: 5`, `  ok: true`, `  blank: " "`, `  msg: real`, ``].join("\n");
    const hits = await extract(source);
    expect(hits.map((h) => h.value)).toEqual(["real"]);
  });

  test("returns empty array on a YAML parse error", async () => {
    const source = `: this is\n  : invalid\n  :: yaml`;
    const hits = await extract(source);
    expect(hits).toEqual([]);
  });
});
