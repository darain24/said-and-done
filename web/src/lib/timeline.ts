// Arranges prompts and commits into session groups for the timeline (FR-42, FR-44).
import type { Commit, Prompt, Session, Story } from "../../../src/story/model";

export type TimelineItem = { kind: "prompt"; prompt: Prompt } | { kind: "commit"; commit: Commit };

export interface TimelineGroup {
  /** null: commits made before the first prompt. */
  session: Session | null;
  /** 1-based position in story.sessions. */
  number: number;
  /** The session already appeared earlier (its prompts interleave with another session's). */
  continued: boolean;
  items: TimelineItem[];
}

export function buildTimeline(story: Story): TimelineGroup[] {
  // Each commit follows the last prompt that led to it; a commit with no
  // prompts follows the last prompt before it in time (0: before them all).
  const commitsAfter = new Map<number, Commit[]>();
  for (const commit of story.commits) {
    let after = 0;
    if (commit.promptNs.length > 0) after = Math.max(...commit.promptNs);
    else for (const p of story.prompts) if (Date.parse(p.at) <= Date.parse(commit.at)) after = p.n;
    commitsAfter.set(after, [...(commitsAfter.get(after) ?? []), commit]);
  }
  const commitItems = (n: number): TimelineItem[] => (commitsAfter.get(n) ?? []).map((commit) => ({ kind: "commit", commit }));

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
