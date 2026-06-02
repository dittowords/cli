import { poExtractor } from "./po";

const extract = (source: string) => poExtractor.extract({ source, kind: "po" });

describe("poExtractor", () => {
  test("emits msgstr when present, falls back to msgid when empty", async () => {
    const source = [
      `msgid ""`,
      `msgstr ""`,
      ``,
      `msgid "Hello"`,
      `msgstr "Bonjour"`,
      ``,
      `msgid "Goodbye"`,
      `msgstr ""`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits).toHaveLength(2);
    expect(hits[0].value).toBe("Bonjour");
    expect(hits[0].context.identifiers).toEqual(["Hello"]);
    expect(hits[1].value).toBe("Goodbye");
    expect(hits[1].context.identifiers).toEqual(["Goodbye"]);
    expect(hits[0].context.parentRole).toBe("resource_value");
  });

  test("skips the empty header entry", async () => {
    const hits = await extract(`msgid ""\nmsgstr "Content-Type: text/plain"\n`);
    expect(hits).toEqual([]);
  });

  test("emits one hit per plural index, tagged plural:N", async () => {
    const source = [
      `msgid "%d item"`,
      `msgid_plural "%d items"`,
      `msgstr[0] "%d item"`,
      `msgstr[1] "%d items"`,
      ``,
    ].join("\n");
    const hits = await extract(source);
    expect(hits).toHaveLength(2);
    expect(hits[0].value).toBe("%d item");
    expect(hits[0].context.identifiers).toEqual(["%d item", "plural:0"]);
    expect(hits[1].value).toBe("%d items");
    expect(hits[1].context.identifiers).toEqual(["%d item", "plural:1"]);
  });

  test("includes msgctxt as the first identifier when present", async () => {
    const source = [`msgctxt "menu"`, `msgid "File"`, `msgstr "Fichier"`, ``].join("\n");
    const hits = await extract(source);
    expect(hits).toHaveLength(1);
    expect(hits[0].context.identifiers).toEqual(["menu", "File"]);
  });

  test("concatenates continuation lines", async () => {
    const source = [`msgid "Hello, "`, `"world"`, `msgstr "Bonjour, "`, `"le monde"`, ``].join("\n");
    const hits = await extract(source);
    expect(hits).toHaveLength(1);
    expect(hits[0].value).toBe("Bonjour, le monde");
    expect(hits[0].context.identifiers).toEqual(["Hello, world"]);
  });

  test("ignores PO comments", async () => {
    const source = [`# translator comment`, `#. extracted`, `msgid "Save"`, `msgstr "Save"`, ``].join("\n");
    const hits = await extract(source);
    expect(hits).toHaveLength(1);
    expect(hits[0].value).toBe("Save");
  });
});
