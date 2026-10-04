// Finds a repo's Claude Code session files (FR-1, ARCHITECTURE §4.1).
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { isInside } from "./parse.js";

export interface LocatedSessions {
  files: string[];
  /** How the files were found, for the scan summary. */
  how: "project folder" | "search" | "sessions dir";
  /** The folder(s) looked in. */
  searched: string[];
}

/** No session files for this repo (exit code 2, ARCHITECTURE §11). */
export class NoSessionsError extends Error {
  constructor(readonly searched: string[]) {
    super(`No Claude Code sessions found for this repo. Looked in:\n${searched.map((s) => `  ${s}`).join("\n")}\nTry --sessions-dir <path>.`);
  }
}

export const defaultProjectsDir = () => join(homedir(), ".claude", "projects");

/** Claude Code's folder name for a project: every non-alphanumeric character becomes "-". */
export const encodeProjectPath = (repoRoot: string) => repoRoot.replace(/[^A-Za-z0-9]/g, "-");

const FALLBACK_LINES = 50;

export async function locateSessions(options: {
  repoRoot: string;
  sessionsDir?: string;
  projectsDir?: string;
}): Promise<LocatedSessions> {
  if (options.sessionsDir !== undefined) {
    const dir = resolve(options.sessionsDir);
    return found(await jsonlFiles(dir), "sessions dir", [dir]);
  }

  const projectsDir = options.projectsDir ?? defaultProjectsDir();
  // The encoding loses information, so the folder is only a first guess.
  const candidate = join(projectsDir, encodeProjectPath(options.repoRoot));
  const direct = await jsonlFiles(candidate);
  if (direct.length > 0) return found(direct, "project folder", [candidate]);

  const matches: string[] = [];
  for (const folder of await subfolders(projectsDir)) {
    for (const file of await jsonlFiles(folder)) {
      if (await mentionsRepo(file, options.repoRoot)) matches.push(file);
    }
  }
  return found(matches, "search", [candidate, projectsDir]);
}

function found(files: string[], how: LocatedSessions["how"], searched: string[]): LocatedSessions {
  if (files.length === 0) throw new NoSessionsError(searched);
  return { files, how, searched };
}

async function jsonlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".jsonl")).map((e) => join(dir, e.name)).sort();
  } catch {
    return [];
  }
}

async function subfolders(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => join(dir, e.name)).sort();
  } catch {
    return [];
  }
}

/** True if any of the first lines has a cwd inside the repo. */
async function mentionsRepo(file: string, repoRoot: string): Promise<boolean> {
  const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  let count = 0;
  try {
    for await (const line of lines) {
      if (++count > FALLBACK_LINES) break;
      try {
        const cwd = (JSON.parse(line) as { cwd?: unknown }).cwd;
        if (typeof cwd !== "string") continue;
        if (isInside(repoRoot, cwd)) return true;
      } catch {
        // malformed lines are the parser's business
      }
    }
  } finally {
    lines.close();
  }
  return false;
}
