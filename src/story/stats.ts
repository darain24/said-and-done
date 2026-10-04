// Story totals (PRD §8 metric definitions).
import type { Commit, Prompt, Stats } from "./model.js";

const ACTIVE_GAP_MS = 20 * 60 * 1000;
const TYPING_WPM = 40;
const SPEAKING_WPM = 150;

/** Whitespace-separated tokens, not counting redaction placeholders. */
export function countWords(text: string): number {
  return text.replace(/\[redacted:[a-z]+\]/g, " ").split(/\s+/).filter(Boolean).length;
}

export function computeStats(prompts: Prompt[], commits: Commit[]): Stats {
  const times = prompts.map((p) => Date.parse(p.at));
  const words = prompts.reduce((sum, p) => sum + p.words, 0);

  let activeMs = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = times[i]! - times[i - 1]!;
    if (gap <= ACTIVE_GAP_MS) activeMs += gap;
  }

  const firstLinked = commits.find((c) => c.promptNs.length > 0);
  const longest = prompts.reduce<Prompt | null>((best, p) => (best === null || p.words > best.words ? p : best), null);

  return {
    prompts: prompts.length,
    words,
    sessions: new Set(prompts.map((p) => p.sessionId)).size,
    commits: commits.length,
    filesTouched: new Set(prompts.flatMap((p) => p.files)).size,
    activeMs,
    firstPromptToFirstCommitMs: firstLinked && times.length > 0 ? Date.parse(firstLinked.at) - times[0]! : null,
    longestPrompt: longest ? { n: longest.n, words: longest.words } : null,
    typingSavedMs: Math.round((words / TYPING_WPM - words / SPEAKING_WPM) * 60_000),
  };
}
