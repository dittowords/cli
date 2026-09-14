import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { GitContext } from "../scan/git";
import { assertScannableCheckout } from "./scan";

/** A real repo on `main`, so the gate runs the `git` calls it runs in a scan. */
describe("assertScannableCheckout", () => {
  let dir: string;

  const run = (...args: string[]) =>
    execFileSync("git", ["-c", "commit.gpgsign=false", ...args], {
      cwd: dir,
      stdio: "ignore",
    });

  const context = (overrides: Partial<GitContext> = {}): GitContext => ({
    repoKey: "github.com/ditto/app",
    repoRoot: dir,
    commitSha: "a".repeat(40),
    branch: "main",
    dirty: false,
    ...overrides,
  });

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "scan-gate-"));
    execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
    run("config", "user.email", "test@example.com");
    run("config", "user.name", "Test");
    fs.writeFileSync(path.join(dir, "a.txt"), "hello\n");
    run("add", ".");
    run("commit", "-m", "init");
    run("remote", "add", "origin", "git@github.com:Ditto/App.git");
    run("update-ref", "refs/remotes/origin/main", "HEAD");
    run("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test("clean checkout of the default branch passes", async () => {
    await expect(assertScannableCheckout(context())).resolves.toBeUndefined();
  });

  test("dirty tree is refused", async () => {
    await expect(
      assertScannableCheckout(context({ dirty: true }))
    ).rejects.toThrow(/Uncommitted changes/);
  });

  test("a dirty tree is refused before the branch is even read", async () => {
    await expect(
      assertScannableCheckout(context({ dirty: true, branch: "feature" }))
    ).rejects.toThrow(/Uncommitted changes/);
  });

  test("a non-default branch is refused, naming both", async () => {
    await expect(
      assertScannableCheckout(context({ branch: "feature" }))
    ).rejects.toThrow(/"feature".*"main"/s);
  });

  test("a detached HEAD is refused", async () => {
    await expect(
      assertScannableCheckout(context({ branch: null }))
    ).rejects.toThrow(/detached/);
  });

  test("passes when the default branch can't be resolved", async () => {
    const bare = fs.mkdtempSync(
      path.join(fs.realpathSync(os.tmpdir()), "scan-nodefault-")
    );
    execFileSync("git", ["init", "-b", "trunk"], {
      cwd: bare,
      stdio: "ignore",
    });
    await expect(
      assertScannableCheckout(context({ repoRoot: bare, branch: "trunk" }))
    ).resolves.toBeUndefined();
    fs.rmSync(bare, { recursive: true, force: true });
  });
});
