import path from "path";

import { runExtract } from "@dittowords/text-extract";

// The extraction itself is the library's to test. This only checks that the
// CLI resolves the package and gets usable candidates back from a real
// directory, so a bad dependency or a changed entry point fails here.
describe("runExtract", () => {
  const testfiles = path.resolve(__dirname, "../../../testfiles");

  it("extracts candidates from the test fixtures", async () => {
    const { candidates, summary } = await runExtract({ inputPath: testfiles });

    expect(summary.filesFailed).toBe(0);
    expect(summary.filesScanned).toBeGreaterThan(0);
    expect(candidates.length).toBe(summary.candidatesEmitted);

    const values = candidates.map((c) => c.value_raw);
    expect(values).toContain("Hello World!");

    // Every candidate carries the fields the CLI reads downstream.
    for (const c of candidates) {
      expect(typeof c.id).toBe("string");
      expect(c.location.file).not.toBe("");
      expect(path.isAbsolute(c.location.file)).toBe(false);
    }
  });
});
