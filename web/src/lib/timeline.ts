// Arranges prompts and commits into session groups for the timeline (FR-42, FR-44).
// Extensions are explicit so the root tests can import this file too.
import type { Commit, Prompt, Session, Story } from "../../../src/story/model.js";

/** A commit's `after` is the prompt it follows (0: before every prompt). */
export type TimelineItem = { kind: "prompt"; prompt: Prompt } | { kind: "commit"; commit: Commit; after: number };

export interface TimelineGroup {
  /** null: commits made before the first prompt. */
  session: Session | null;
  /** 1-based position in story.sessions. */
  number: number;
  /** The session already appeared earlier (its prompts interleave with another session's). */
  continued: boolean;
  items: TimelineItem[];
}

/**
 * The prompt each commit follows, by sha. A commit follows the last prompt that
 * led to it; a commit with no prompts follows the last prompt before it in time
 * (0: before them all).
 */
export function commitAnchors(story: Story): Map<string, number> {
  const anchors = new Map<string, number>();
  for (const commit of story.commits) {
    let after = 0;
    if (commit.promptNs.length > 0) after = Math.max(...commit.promptNs);
    else for (const p of story.prompts) if (Date.parse(p.at) <= Date.parse(commit.at)) after = p.n;
    anchors.set(commit.sha, after);
  }
  return anchors;
}

export function buildTimeline(story: Story): TimelineGroup[] {
  const anchors = commitAnchors(story);
  const commitsAfter = new Map<number, Commit[]>();
  for (const commit of story.commits) {
    const after = anchors.get(commit.sha) ?? 0;
    commitsAfter.set(after, [...(commitsAfter.get(after) ?? []), commit]);
  }
  const commitItems = (n: number): TimelineItem[] => (commitsAfter.get(n) ?? []).map((commit) => ({ kind: "commit", commit, after: n }));

  const groups: TimelineGroup[] = [];
  const leading = commitItems(0);
  if (leading.length > 0) groups.push({ session: null, number: 0, continued: false, items: leading });

  const seen = new Set<string>();
  let current: TimelineGroup | undefined;
  for (const prompt of story.prompts) {
    if (current?.session?.id !== prompt.sessionId) {
      const index = story.sessions.findIndex((s) => s.id === prompt.sessionId);
      current = {
        session: story.sessions[index] ?? { id: prompt.sessionId, start: prompt.at, end: prompt.at, promptCount: 0 },
        number: index + 1,
        continued: seen.has(prompt.sessionId),
        items: [],
      };
      seen.add(prompt.sessionId);
      groups.push(current);
    }
    current.items.push({ kind: "prompt", prompt }, ...commitItems(prompt.n));
  }
  return groups;
}
