import { resxExtractor } from "./resx";

const extract = (source: string) =>
  resxExtractor.extract({ source, kind: "resx" });

// .resx shares `emitTextHit` with the Android extractor, which decodes escapes.
// XML has no backslash escapes, so .resx passes no transform and keeps values
// exactly as written.
describe("resxExtractor leaves values verbatim", () => {
  test("does not decode a backslash sequence", async () => {
    const hits = await extract(
      `<root><data name="a"><value>line one\\nline two</value></data></root>`
    );
    expect(hits[0].value).toBe("line one\\nline two");
  });
});
