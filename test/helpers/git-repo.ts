// Builds throwaway git repos with fixed commit dates for tests.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// Isolate from the developer's own git config: no signing, hooks or templates.
const ISOLATED = ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "-c", "init.templateDir="];

export interface TempRepo {
  root: string;
  /** Writes the files (string or Buffer contents), stages everything and commits at `at`. Returns the sha. */
  commit(at: string, subject: string, files: Record<string, string | Buffer>): string;
  remove(): void;
}

export function makeTempRepo(): TempRepo {
  const root = mkdtempSync(join(tmpdir(), "said-git-"));
  const git = (args: string[], env: Record<string, string> = {}) =>
    execFileSync("git", [...ISOLATED, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", ...env },
    }).trim();

  git(["init", "-q", "-b", "main"]);
  git(["config", "user.name", "Test"]);
  git(["config", "user.email", "test@example.test"]);

  return {
    root,
    commit(at, subject, files) {
      for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        if (content === "") rmSync(join(root, path), { force: true });
        else writeFileSync(join(root, path), content);
      }
      git(["add", "-A"]);
      git(["commit", "-q", "--allow-empty", "-m", subject], { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at });
      return git(["rev-parse", "HEAD"]);
    },
    remove: () => rmSync(root, { recursive: true, force: true }),
  };
}
