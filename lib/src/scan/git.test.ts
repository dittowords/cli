import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Real git repos, not mocks: this checkout, plus a throwaway repo in the temp
 * directory for the awkward states. Needs `git` on PATH and a real `.git`.
 */
import { normalizeRepoKey, readGitContext, REPO_KEY_PATTERN } from "./git";

describe("normalizeRepoKey", () => {
  const cases: [string, string | null][] = [
    ["git@github.com:Ditto/App.git", "github.com/ditto/app"],
    ["https://github.com/ditto/app", "github.com/ditto/app"],
    ["https://github.com/ditto/app.git", "github.com/ditto/app"],
    ["ssh://git@github.com:2222/ditto/app.git", "github.com/ditto/app"],
    ["git@github.com:2222/ditto/app.git", "github.com/2222/ditto/app"],
    ["git://github.com/ditto/app.git", "github.com/ditto/app"],
    ["https://user:token@github.com/ditto/app.git", "github.com/ditto/app"],
    [
      "https://x-access-token:ghs_abc@github.com/ditto/app",
      "github.com/ditto/app",
    ],
    ["git@gitlab.com:group/subgroup/app.git", "gitlab.com/group/subgroup/app"],
    [
      "https://gitlab.com/group/sub/deeper/app.git",
      "gitlab.com/group/sub/deeper/app",
    ],
    ["/Users/dev/Desktop/Ditto/cli", null],
    ["file:///Users/dev/Desktop/Ditto/cli", null],
    ["https://github.com/app", null],
    ["", null],
  ];

  test.each(cases)("%s", (remoteUrl, expected) => {
    expect(normalizeRepoKey(remoteUrl)).toBe(expected);
  });

  test("never leaks credentials", () => {
    const key = normalizeRepoKey(
      "https://user:s3cret@github.com/ditto/app.git"
    );
    expect(key).not.toMatch(/s3cret|user|@/);
  });

  /** Cannot fail today - `normalizeRepoKey` already applies the pattern. */
  test("every non-null key satisfies REPO_KEY_PATTERN", () => {
    for (const [remoteUrl] of cases) {
      const key = normalizeRepoKey(remoteUrl);
      if (key !== null) expect(key).toMatch(REPO_KEY_PATTERN);
    }
  });
});

describe("readGitContext", () => {
  /**
   * Skips `branch` and `dirty` on purpose: CI checks out a detached HEAD, and
   * local runs usually have uncommitted work.
   */
  test("reads this repo", async () => {
    const context = await readGitContext(__dirname);
    expect(context).not.toBeNull();
    expect(context!.repoKey).toBe("github.com/dittowords/cli");
    expect(context!.commitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(context!.repoRoot).toBe(
      fs.realpathSync(path.resolve(__dirname, "../../.."))
    );
  });

  test("resolves null outside a repo", async () => {
    await expect(
      readGitContext(fs.realpathSync(os.tmpdir()))
    ).resolves.toBeNull();
  });

  /**
   * One repo walked through each state - no remote, remote, edited file,
   * detached HEAD - restored after each test. Sets its own identity and
   * disables signing so it ignores the local global git config.
   */
  describe("temp repo", () => {
    let dir: string;

    beforeAll(() => {
      dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "git-ctx-"));
      const run = (...args: string[]) =>
        execFileSync("git", ["-c", "commit.gpgsign=false", ...args], {
          cwd: dir,
          stdio: "ignore",
        });
      run("init", "-b", "main");
      run("config", "user.email", "test@example.com");
      run("config", "user.name", "Test");
      fs.writeFileSync(path.join(dir, "a.txt"), "hello\n");
      run("add", ".");
      run("commit", "-m", "init");
    });

    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    test("no remote resolves null", async () => {
      await expect(readGitContext(dir)).resolves.toBeNull();
    });

    test("branch, sha and clean tree", async () => {
      execFileSync(
        "git",
        ["remote", "add", "origin", "git@github.com:Ditto/App.git"],
        {
          cwd: dir,
          stdio: "ignore",
        }
      );
      const context = await readGitContext(dir);
      expect(context).toEqual({
        repoKey: "github.com/ditto/app",
        repoRoot: dir,
        commitSha: expect.stringMatching(/^[0-9a-f]{40}$/),
        branch: "main",
        dirty: false,
      });
    });

    test("dirty tree", async () => {
      fs.writeFileSync(path.join(dir, "a.txt"), "changed\n");
      const context = await readGitContext(dir);
      expect(context!.dirty).toBe(true);
      execFileSync("git", ["checkout", "--", "a.txt"], {
        cwd: dir,
        stdio: "ignore",
      });
    });

    test("detached HEAD gives a null branch and a sha", async () => {
      const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir })
        .toString()
        .trim();
      execFileSync("git", ["checkout", "--detach", sha], {
        cwd: dir,
        stdio: "ignore",
      });
      const context = await readGitContext(dir);
      expect(context!.branch).toBeNull();
      expect(context!.commitSha).toBe(sha);
      execFileSync("git", ["checkout", "main"], { cwd: dir, stdio: "ignore" });
    });
  });
});
