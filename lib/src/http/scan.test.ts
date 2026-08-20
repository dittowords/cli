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

  test("sends repo, sha, branch and repo-relative root when there is", () => {
    expect(buildInitiateScanBody("/Users/laura/cli/lib/src", context)).toEqual({
      path: "/Users/laura/cli/lib/src",
      repoKey: "github.com/dittowords/cli",
      gitCommitSha: "d3c1a8148580e1869c91ee6caadda17165ceb0ea",
      gitBranch: "master",
      repoRelativeRoot: "lib/src",
    });
  });

  test("sends an empty repo-relative root when scanning the repo root", () => {
    const body = buildInitiateScanBody("/Users/laura/cli", context);
    expect(body.repoRelativeRoot).toBe("");
  });

  test("omits the repo-relative root when the path is outside the repo", () => {
    const body = buildInitiateScanBody("/elsewhere/src", context);
    expect(body).not.toHaveProperty("repoRelativeRoot");
  });

  test("sends a null branch on a detached HEAD", () => {
    const body = buildInitiateScanBody("/Users/laura/cli", {
      ...context,
      branch: null,
    });
    expect(body.gitBranch).toBeNull();
    expect(body.gitCommitSha).toBe(context.commitSha);
  });

  test("never sends repoRoot or dirty", () => {
    const body = buildInitiateScanBody("/Users/laura/cli/lib", {
      ...context,
      dirty: true,
    });
    expect(Object.keys(body).sort()).toEqual([
      "gitBranch",
      "gitCommitSha",
      "path",
      "repoKey",
      "repoRelativeRoot",
    ]);
  });

  test("every body satisfies the request schema", () => {
    for (const c of [null, context, { ...context, branch: null }]) {
      expect(() =>
        ZInitiateScanBodySchema.parse(
          buildInitiateScanBody("/Users/laura/cli/lib", c)
        )
      ).not.toThrow();
    }
  });
});
