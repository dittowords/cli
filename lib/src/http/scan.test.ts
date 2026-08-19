import { GitContext } from "../scan/git";
import { buildInitiateScanBody } from "./scan";
import { ZInitiateScanBodySchema } from "./types";

const context: GitContext = {
  repoKey: "github.com/dittowords/cli",
  repoRoot: "/Users/laura/cli",
  commitSha: "d3c1a8148580e1869c91ee6caadda17165ceb0ea",
  branch: "master",
  dirty: false,
};

describe("buildInitiateScanBody", () => {
  test("sends only path when there is no git context", () => {
    expect(buildInitiateScanBody("/repo", null)).toEqual({ path: "/repo" });
  });

  test("sends repo, sha and branch when there is", () => {
    expect(buildInitiateScanBody("/repo", context)).toEqual({
      path: "/repo",
      repoKey: "github.com/dittowords/cli",
      gitCommitSha: "d3c1a8148580e1869c91ee6caadda17165ceb0ea",
      gitBranch: "master",
    });
  });

  test("sends a null branch on a detached HEAD", () => {
    const body = buildInitiateScanBody("/repo", { ...context, branch: null });
    expect(body.gitBranch).toBeNull();
    expect(body.gitCommitSha).toBe(context.commitSha);
  });

  test("never sends repoRoot or dirty", () => {
    const body = buildInitiateScanBody("/repo", { ...context, dirty: true });
    expect(Object.keys(body).sort()).toEqual([
      "gitBranch",
      "gitCommitSha",
      "path",
      "repoKey",
    ]);
  });

  test("every body satisfies the request schema", () => {
    for (const c of [null, context, { ...context, branch: null }]) {
      expect(() =>
        ZInitiateScanBodySchema.parse(buildInitiateScanBody("/repo", c))
      ).not.toThrow();
    }
  });
});
