// Replay timing and what has been revealed at a point in the replay (FR-47, DESIGN §6).
// No DOM here, so the root tests can import it.
import type { Stats, Story } from "../../../src/story/model.js";
import { computeStats } from "../../../src/story/stats.js";

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** How long a revealed prompt stays current: clamp(1.2 s, 0.6 s + 12 ms × words, 4 s) at 1×. */
export function tickMs(words: number, speed: Speed): number {
  return Math.min(4000, Math.max(1200, 600 + 12 * words)) / speed;
}

/** The number of the last revealed prompt, when `cursor` prompts are showing (0: none). */
export function revealedN(story: Story, cursor: number): number {
  return cursor > 0 ? (story.prompts[cursor - 1]?.n ?? 0) : 0;
}

/** Totals for what's on screen: the revealed prompts and the commits that follow them. */
export function statsAt(story: Story, anchors: Map<string, number>, cursor: number): Stats {
  const n = revealedN(story, cursor);
  const commits = story.commits.filter((c) => (anchors.get(c.sha) ?? 0) <= n);
  return computeStats(story.prompts.slice(0, cursor), commits);
}

/** Card entrance: fades in and rises 8 px over 300 ms, without the rise under reduced motion (DESIGN §7). */
export const REVEAL_CLASS = "transition-[opacity,translate] duration-300 ease-out starting:opacity-0 motion-safe:starting:translate-y-2";
