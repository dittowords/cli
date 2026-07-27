import {
  analyzeDirectories,
  rollupCandidateCountsToParentPaths,
  joinDisplayPath,
  formatOverLimitMessage,
  formatDirectoryBreakdown,
} from "./analyzeDirectories";

// Expands a { path: count } spec into the flat file-path list analyzeDirectories
// consumes (one entry per candidate).
function files(spec: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [file, n] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) out.push(file);
  }
  return out;
}

describe("analyzeDirectories", () => {
  test("returns the largest fitting subtrees, sorted by count desc", () => {
    const analysis = analyzeDirectories(
      files({
        "src/components/a.ts": 842,
        "src/screens/a.ts": 610,
        "src/features/onboarding/a.ts": 512,
        "server/api/a.ts": 400,
        "server/db/a.ts": 300,
      }),
      1000
    );

    expect(analysis.total).toBe(2664);
    expect(analysis.suggestions).toEqual([
      { dir: "src/components", count: 842 },
      { dir: "server", count: 700 },
      { dir: "src/screens", count: 610 },
      { dir: "src/features", count: 512 },
    ]);
  });

  test("prefers the child when the parent is over the limit", () => {
    const analysis = analyzeDirectories(
      files({ "a/b/x.ts": 500, "a/c.ts": 800 }),
      1000
    );
    expect(analysis.suggestions).toEqual([{ dir: "a/b", count: 500 }]);
  });

  test("descends to a grandchild when parent and child are both over", () => {
    const analysis = analyzeDirectories(
      files({ "a/b/c/x.ts": 900, "a/b/d.ts": 500, "a/e.ts": 700 }),
      1000
    );
    expect(analysis.suggestions).toEqual([{ dir: "a/b/c", count: 900 }]);
  });

  test("frontier directories are disjoint (none is an ancestor of another)", () => {
    const analysis = analyzeDirectories(
      files({
        "src/components/a.ts": 842,
        "src/screens/a.ts": 610,
        "src/features/onboarding/a.ts": 512,
        "server/api/a.ts": 400,
        "server/db/a.ts": 300,
      }),
      1000
    );
    const dirs = analysis.suggestions.map((s) => s.dir);
    for (const a of dirs) {
      for (const b of dirs) {
        if (a === b) continue;
        expect(b.startsWith(`${a}/`)).toBe(false);
      }
    }
  });

  test("caps suggestions and reports the omitted count and coverage", () => {
    const spec: Record<string, number> = {};
    for (let i = 1; i <= 12; i++) {
      spec[`d${String(i).padStart(2, "0")}/a.ts`] = 100;
    }
    const analysis = analyzeDirectories(files(spec), 150);

    expect(analysis.total).toBe(1200);
    expect(analysis.suggestions).toHaveLength(10);
    expect(analysis.omittedFittingCount).toBe(2);
    // Equal counts tie-break alphabetically → d01..d10 shown.
    expect(analysis.suggestions.map((s) => s.dir)).toEqual([
      "d01",
      "d02",
      "d03",
      "d04",
      "d05",
      "d06",
      "d07",
      "d08",
      "d09",
      "d10",
    ]);
  });

  test("all strings at top level → no suggestions, root blocker", () => {
    const analysis = analyzeDirectories(
      files({ "a.ts": 1500, "b.ts": 700 }),
      1000
    );
    expect(analysis.suggestions).toEqual([]);
  });

  test("single over-limit leaf directory is named as the blocker", () => {
    const analysis = analyzeDirectories(
      files({ "src/generated/a.ts": 5000 }),
      1000
    );
    expect(analysis.suggestions).toEqual([]);
  });
});

describe("rollupByDirectory", () => {
  test("root count equals total and ancestors sum correctly", () => {
    const subtree = rollupCandidateCountsToParentPaths(
      files({ "a/b/c.ts": 2, "a/d.ts": 3 })
    );
    expect(subtree.get("")).toBe(5);
    expect(subtree.get("a")).toBe(5);
    expect(subtree.get("a/b")).toBe(2);
  });
});

describe("joinDisplayPath", () => {
  test("joins the original path arg with a relative dir", () => {
    expect(joinDisplayPath(".", "src")).toBe("src");
    expect(joinDisplayPath("frontend", "src/x")).toBe("frontend/src/x");
    expect(joinDisplayPath("./frontend", "src")).toBe("frontend/src");
    expect(joinDisplayPath("frontend/", "src")).toBe("frontend/src");
    expect(joinDisplayPath("/abs", "src")).toBe("/abs/src");
  });
});

describe("formatOverLimitMessage", () => {
  const base = files({
    "src/components/a.ts": 842,
    "src/screens/a.ts": 610,
    "server/api/a.ts": 700,
  });

  test("renders ranked commands rooted at the original path", () => {
    const msg = formatOverLimitMessage(analyzeDirectories(base, 1000), {
      plan: "free",
      originalPath: "frontend",
    });
    expect(msg).toContain("2,152 strings, but your free plan allows 1,000");
    expect(msg).toContain("npx @dittowords/cli scan frontend/src/components");
    expect(msg).toContain("--list-directories");
    expect(msg).not.toMatch(/upgrade/i);
  });

  test("names the blocker when nothing fits", () => {
    const msg = formatOverLimitMessage(
      analyzeDirectories(files({ "src/generated/a.ts": 5000 }), 1000),
      { plan: "trial", originalPath: "." }
    );
    expect(msg).toContain("`src/generated` alone has 5,000 strings");
    expect(msg).not.toMatch(/upgrade/i);
  });
});

describe("formatDirectoryBreakdown", () => {
  test("prints every rolled-up directory in tree order", () => {
    const out = formatDirectoryBreakdown(
      files({ "src/components/a.ts": 2, "src/screens/a.ts": 1 }),
      "frontend"
    );
    const lines = out.split("\n");
    expect(lines[0]).toBe("Strings by directory (rolled up), under frontend:");
    // ROOT first, then src, then its children alphabetically.
    const dirRows = lines.filter((l) => /\d/.test(l));
    expect(dirRows[0]).toContain("(whole scan)");
    expect(out).toContain("src/components");
    expect(out).toContain("src/screens");
  });
});
