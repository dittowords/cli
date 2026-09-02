import { GitContext } from "../scan/git";
import { buildInitiateScanBody, MAX_SCAN_RENAMES } from "./scan";
import { ZInitiateScanBodySchema } from "./types";

const context: GitContext = {
  repoKey: "github.com/dittowords/cli",
  repoRoot: "/Users/dev/cli",
  commitSha: "d3c1a8148580e1869c91ee6caadda17165ceb0ea",
  branch: "master",
  dirty: false,
};

describe("buildInitiateScanBody", () => {
  test("sends only path when there is no git context", () => {
    expect(buildInitiateScanBody("/repo", null)).toEqual({ path: "/repo" });
  });

  test("sends repo, sha, branch and repo-relative root when there is", () => {
    expect(buildInitiateScanBody("/Users/dev/cli/lib/src", context)).toEqual({
      path: "/Users/dev/cli/lib/src",
      repoKey: "github.com/dittowords/cli",
      gitCommitSha: "d3c1a8148580e1869c91ee6caadda17165ceb0ea",
      gitBranch: "master",
      repoRelativeRoot: "lib/src",
      scannedAllPaths: false,
      scannedPaths: ["lib/src"],
    });
  });

  test("scanning the repo root covers every path, with no path list", () => {
    const body = buildInitiateScanBody("/Users/dev/cli", context);
    expect(body.repoRelativeRoot).toBe("");
    expect(body.scannedAllPaths).toBe(true);
    expect(body).not.toHaveProperty("scannedPaths");
  });

  test("omits the whole scope when the path is outside the repo", () => {
    const body = buildInitiateScanBody("/elsewhere/src", context);
    expect(body).not.toHaveProperty("repoRelativeRoot");
    expect(body).not.toHaveProperty("scannedAllPaths");
    expect(body).not.toHaveProperty("scannedPaths");
  });

  test("scanned paths are relative to the repo root, not the scanned root", () => {
    const body = buildInitiateScanBody("/Users/dev/cli/lib/src", context);
    expect(body.scannedPaths).toEqual([body.repoRelativeRoot]);
  });

  test("sends a null branch on a detached HEAD", () => {
    const body = buildInitiateScanBody("/Users/dev/cli", {
      ...context,
      branch: null,
    });
    expect(body.gitBranch).toBeNull();
    expect(body.gitCommitSha).toBe(context.commitSha);
  });

  test("never sends repoRoot or dirty", () => {
    const body = buildInitiateScanBody("/Users/dev/cli/lib", {
      ...context,
      dirty: true,
    });
    expect(Object.keys(body).sort()).toEqual([
      "gitBranch",
      "gitCommitSha",
      "path",
      "repoKey",
      "repoRelativeRoot",
      "scannedAllPaths",
      "scannedPaths",
    ]);
  });

  test("sends the renames git found since the last scan", () => {
    const renames = [{ from: "src/Old.tsx", to: "src/New.tsx" }];
    const body = buildInitiateScanBody("/Users/dev/cli", context, renames);
    expect(body.renamesSinceLastScan).toEqual(renames);
  });

  test("omits the renames entirely when git found none", () => {
    const body = buildInitiateScanBody("/Users/dev/cli", context, []);
    expect(body).not.toHaveProperty("renamesSinceLastScan");
  });

  test("caps a refactor that moved more files than one scan carries", () => {
    const renames = Array.from({ length: MAX_SCAN_RENAMES + 5 }, (_, i) => ({
      from: `src/Old${i}.tsx`,
      to: `src/New${i}.tsx`,
    }));
    const body = buildInitiateScanBody("/Users/dev/cli", context, renames);
    expect(body.renamesSinceLastScan).toHaveLength(MAX_SCAN_RENAMES);
  });

  test("every body satisfies the request schema", () => {
    for (const c of [null, context, { ...context, branch: null }]) {
      expect(() =>
        ZInitiateScanBodySchema.parse(
          buildInitiateScanBody("/Users/dev/cli/lib", c)
        )
      ).not.toThrow();
    }
  });
});
