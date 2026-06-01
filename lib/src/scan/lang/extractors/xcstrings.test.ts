import { xcstringsExtractor } from "./xcstrings";

const extract = (source: string) => xcstringsExtractor.extract({ source, kind: "ios_xcstrings" });

describe("xcstringsExtractor", () => {
  test("emits one hit per locale's stringUnit value", async () => {
    const source = JSON.stringify(
      {
        sourceLanguage: "en",
        strings: {
          hello: {
            localizations: {
              en: { stringUnit: { value: "Hello" } },
              es: { stringUnit: { value: "Hola" } },
            },
          },
        },
      },
      null,
      2
    );
    const hits = await extract(source);
    expect(hits.map((h) => h.value).sort()).toEqual(["Hello", "Hola"]);
    expect(hits.every((h) => h.context.parentRole === "resource_value")).toBe(true);
    expect(hits.every((h) => h.context.identifiers[0] === "hello")).toBe(true);
  });

  test("walks plural variations and accumulates variant labels in identifiers", async () => {
    const source = JSON.stringify(
      {
        strings: {
          items_plural: {
            localizations: {
              en: {
                variations: {
                  plural: {
                    one: { stringUnit: { value: "%d item" } },
                    other: { stringUnit: { value: "%d items" } },
                  },
                },
              },
            },
          },
        },
      },
      null,
      2
    );
    const hits = await extract(source);
    expect(hits.map((h) => h.value).sort()).toEqual(["%d item", "%d items"]);
    const one = hits.find((h) => h.value === "%d item");
    expect(one?.context.identifiers).toEqual(["items_plural", "plural", "one"]);
  });

  test("skips empty/whitespace-only values", async () => {
    const source = JSON.stringify({
      strings: {
        empty: { localizations: { en: { stringUnit: { value: "  " } } } },
        ok: { localizations: { en: { stringUnit: { value: "Real" } } } },
      },
    });
    const hits = await extract(source);
    expect(hits.map((h) => h.value)).toEqual(["Real"]);
  });

  test("returns empty for invalid or non-catalog JSON", async () => {
    expect(await extract(`not json`)).toEqual([]);
    expect(await extract(`{"strings": []}`)).toEqual([]);
  });
});
