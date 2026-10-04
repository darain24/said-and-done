// The Story document (ARCHITECTURE §7). assemble.ts is the only place one is
// built; `said scan --json` prints it and `said build` injects it into the page.
import type { ParseDiagnostics } from "../sessions/parse.js";
import type { LinkConfidence } from "./correlate.js";

export interface Story {
  schemaVersion: 1;
  generatedAt: string;
  generator: { name: "said-and-done"; version: string };
  /** remoteUrl is https only, with no credentials. */
  repo: { name: string; remoteUrl?: string };
  title: string;
  redacted: boolean;
  filters: StoryFilters;
  sessions: Session[];
  /** Sorted by time, numbered from 1. */
  prompts: Prompt[];
  /** Sorted by time. */
  commits: Commit[];
  stats: Stats;
  diagnostics: ParseDiagnostics & { excludedByFilter: number };
}

export interface StoryFilters {
  since?: string;
  until?: string;
  excludedSessions: string[];
}

export interface Session {
  id: string;
  start: string;
  end: string;
  promptCount: number;
}

export interface Prompt {
  n: number;
  id: string;
  sessionId: string;
  at: string;
  text: string;
  words: number;
  /** Relative to the repo, deduped, in the order first touched. */
  files: string[];
  /** null: uncommitted. */
  commitSha: string | null;
  /** Raw promptSource, informational only. Never proof of voice. */
  source?: string;
}

export interface Commit {
  sha: string;
  at: string;
  subject: string;
  files: { path: string; added: number; removed: number }[];
  added: number;
  removed: number;
  promptNs: number[];
  confidence: LinkConfidence;
}

export interface Stats {
  prompts: number;
  words: number;
  sessions: number;
  commits: number;
  filesTouched: number;
  activeMs: number;
  firstPromptToFirstCommitMs: number | null;
  longestPrompt: { n: number; words: number } | null;
  /** Estimate: typing at 40 wpm vs speaking at 150 wpm (PRD §8). */
  typingSavedMs: number;
}
