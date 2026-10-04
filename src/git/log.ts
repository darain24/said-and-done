// Reads the repo's git log with per-file line stats (FR-10, ARCHITECTURE §5).
// Author names and emails are never requested.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface CommitFile {
  path: string;
  added: number;
  removed: number;
}

export interface GitCommit {
  sha: string;
  /** Committer time as UTC ISO, so it sorts and compares with prompt timestamps. */
  at: string;
  subject: string;
  files: CommitFile[];
  added: number;
  removed: number;
}

/** git is missing, or a git command failed (exit code 3, ARCHITECTURE §11). */
export class GitError extends Error {
  constructor(message: string, readonly exitCode?: number) {
    super(message);
  }
}

const RECORD = "\x1e";
const FIELD = "\x1f";

async function git(repoRoot: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await run("git", ["-C", repoRoot, "-c", "core.quotePath=false", ...args], {
      maxBuffer: 256 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const e = error as { code?: string | number; stderr?: string; message: string };
    if (e.code === "ENOENT") throw new GitError("git isn't installed or isn't on PATH.");
    const exitCode = typeof e.code === "number" ? e.code : undefined;
    throw new GitError(`git ${args[0]} failed: ${e.stderr?.trim() || e.message}`, exitCode);
  }
}

async function hasCommits(repoRoot: string): Promise<boolean> {
  try {
    await git(repoRoot, ["rev-parse", "--quiet", "--verify", "HEAD"]);
    return true;
  } catch (error) {
    // Exit 1: a repo whose HEAD has no commits yet. Anything else (128: not a repo) is real.
    if (error instanceof GitError && error.exitCode === 1) return false;
    throw error;
  }
}

/** Oldest first. A repo with no commits gives an empty list. */
export async function readGitLog(repoRoot: string): Promise<GitCommit[]> {
  if (!(await hasCommits(repoRoot))) return [];
  // --no-renames: a rename shows as a delete plus an add, so paths need no parsing.
  const out = await git(repoRoot, ["log", "--reverse", "--no-renames", "--numstat", `--format=${RECORD}%H${FIELD}%cI${FIELD}%s`]);
  return out.split(RECORD).filter((record) => record.trim() !== "").map(parseRecord);
}

function parseRecord(record: string): GitCommit {
  const [header = "", ...stats] = record.split("\n");
  const [sha = "", date = "", subject = ""] = header.split(FIELD);
  const files: CommitFile[] = [];
  for (const line of stats) {
    const [added, removed, ...path] = line.split("\t");
    if (path.length === 0) continue;
    // Binary files show "-" for both counts.
    files.push({ path: path.join("\t"), added: Number(added) || 0, removed: Number(removed) || 0 });
  }
  return {
    sha,
    at: new Date(date).toISOString(),
    subject,
    files,
    added: files.reduce((sum, f) => sum + f.added, 0),
    removed: files.reduce((sum, f) => sum + f.removed, 0),
  };
}
