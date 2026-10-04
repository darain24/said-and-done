// Links prompts to the commit that followed them (FR-11, ARCHITECTURE §5).
//
// Walking commits oldest first, each commit takes every prompt not yet taken
// whose time is at or before the commit. That matches how a build goes: a few
// prompts, then "commit this". Confidence says how sure the link is:
//   files  the prompts' edits overlap the commit's changed files
//   time   only the time window matches
//   none   no prompts led to this commit (e.g. made before recording)
// Prompts after the last commit stay uncommitted.
import type { GitCommit } from "../git/log.js";

export type LinkConfidence = "files" | "time" | "none";

export interface LinkedCommit extends GitCommit {
  promptIds: string[];
  confidence: LinkConfidence;
}

export interface Correlation {
  /** Sorted by time. Commits with no prompts are kept. */
  commits: LinkedCommit[];
  /** Every prompt id → the sha of its commit, or null if uncommitted. */
  commitByPrompt: Map<string, string | null>;
}

interface PromptLike {
  id: string;
  at: string;
}

interface TouchLike {
  promptId: string;
  path: string;
}

/** Git times have whole seconds, so a prompt counts as before a commit made in the same second. */
const promptSecond = (at: string) => Math.floor(Date.parse(at) / 1000) * 1000;

export function correlate(prompts: PromptLike[], touches: TouchLike[], commits: GitCommit[]): Correlation {
  const byTime = <T extends { at: string }>(list: T[]) => [...list].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const orderedPrompts = byTime(prompts);

  const filesByPrompt = new Map<string, Set<string>>();
  for (const touch of touches) {
    const files = filesByPrompt.get(touch.promptId) ?? new Set<string>();
    files.add(touch.path);
    filesByPrompt.set(touch.promptId, files);
  }

  const commitByPrompt = new Map<string, string | null>(orderedPrompts.map((p) => [p.id, null]));
  let next = 0;

  const linked = byTime(commits).map((commit): LinkedCommit => {
    const commitTime = Date.parse(commit.at);
    const promptIds: string[] = [];
    while (next < orderedPrompts.length && promptSecond(orderedPrompts[next]!.at) <= commitTime) {
      const prompt = orderedPrompts[next++]!;
      promptIds.push(prompt.id);
      commitByPrompt.set(prompt.id, commit.sha);
    }

    let confidence: LinkConfidence = "none";
    if (promptIds.length > 0) {
      const changed = new Set(commit.files.map((f) => f.path));
      const overlaps = promptIds.some((id) => [...(filesByPrompt.get(id) ?? [])].some((path) => changed.has(path)));
      confidence = overlaps ? "files" : "time";
    }
    return { ...commit, promptIds, confidence };
  });

  return { commits: linked, commitByPrompt };
}
