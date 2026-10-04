// The only place a Story is built (ARCHITECTURE §7). Order matters:
// filter (FR-6) → redact (FR-20) → correlate (FR-11) → number → stats,
// so filtered prompts affect nothing and nothing unredacted reaches the story.
import { basename } from "node:path";
import { type GitCommit, findRepoRoot, readGitLog, readRemoteUrl } from "../git/log.js";
import { type RedactionHits, REDACTION_KINDS, redactText } from "../redact.js";
import { type LocatedSessions, locateSessions } from "../sessions/locate.js";
import { type ParseResult, parseSessionFiles } from "../sessions/parse.js";
import { version } from "../version.js";
import { correlate } from "./correlate.js";
import type { Commit, Prompt, Session, Story, StoryFilters } from "./model.js";
import { computeStats, countWords } from "./stats.js";

export interface AssembleInput {
  repoName: string;
  remoteUrl?: string;
  title?: string;
  parsed: ParseResult;
  commits: GitCommit[];
  filters: StoryFilters;
  redact: boolean;
  now: Date;
}

export interface Assembled {
  story: Story;
  redactionHits: RedactionHits;
}

/** A session is excluded by its full id or any prefix of it, so short ids can be spoken. */
const isExcluded = (sessionId: string, excluded: string[]) => excluded.some((id) => sessionId.startsWith(id));

export function assembleStory(input: AssembleInput): Assembled {
  const { parsed, filters } = input;
  const since = filters.since === undefined ? -Infinity : Date.parse(filters.since);
  const until = filters.until === undefined ? Infinity : Date.parse(filters.until);

  const kept = parsed.prompts.filter((p) => {
    const at = Date.parse(p.at);
    return at >= since && at <= until && !isExcluded(p.sessionId, filters.excludedSessions);
  });
  const keptIds = new Set(kept.map((p) => p.id));

  const hits = Object.fromEntries(REDACTION_KINDS.map((kind) => [kind, 0])) as RedactionHits;
  const redact = (text: string) => {
    if (!input.redact) return text;
    const result = redactText(text);
    for (const kind of REDACTION_KINDS) hits[kind] += result.hits[kind];
    return result.text;
  };

  const prompts = kept.map((p) => ({ ...p, text: redact(p.text) }));
  const touches = parsed.touches.filter((t) => keptIds.has(t.promptId)).map((t) => ({ ...t, path: redact(t.path) }));
  const gitCommits = input.commits.map((c) => ({
    ...c,
    subject: redact(c.subject),
    files: c.files.map((f) => ({ ...f, path: redact(f.path) })),
  }));

  const { commits: linked, commitByPrompt } = correlate(prompts, touches, gitCommits);

  const filesByPrompt = new Map<string, string[]>();
  for (const t of touches) {
    const files = filesByPrompt.get(t.promptId) ?? [];
    if (!files.includes(t.path)) files.push(t.path);
    filesByPrompt.set(t.promptId, files);
  }

  const storyPrompts: Prompt[] = prompts.map((p, i) => ({
    n: i + 1,
    id: p.id,
    sessionId: p.sessionId,
    at: p.at,
    text: p.text,
    words: countWords(p.text),
    files: filesByPrompt.get(p.id) ?? [],
    commitSha: commitByPrompt.get(p.id) ?? null,
    ...(p.source !== undefined ? { source: p.source } : {}),
  }));
  const nById = new Map(storyPrompts.map((p) => [p.id, p.n]));

  const commits: Commit[] = linked.map((c) => ({
    sha: c.sha,
    at: c.at,
    subject: c.subject,
    files: c.files,
    added: c.added,
    removed: c.removed,
    promptNs: c.promptIds.map((id) => nById.get(id)!),
    confidence: c.confidence,
  }));

  const sessionsById = new Map<string, Session>();
  for (const p of storyPrompts) {
    const s = sessionsById.get(p.sessionId);
    if (s) {
      s.end = p.at;
      s.promptCount++;
    } else {
      sessionsById.set(p.sessionId, { id: p.sessionId, start: p.at, end: p.at, promptCount: 1 });
    }
  }

  const story: Story = {
    schemaVersion: 1,
    generatedAt: input.now.toISOString(),
    generator: { name: "said-and-done", version: version() },
    repo: { name: input.repoName, ...(input.remoteUrl ? { remoteUrl: input.remoteUrl } : {}) },
    title: input.title ?? input.repoName,
    redacted: input.redact,
    filters,
    sessions: [...sessionsById.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    prompts: storyPrompts,
    commits,
    stats: computeStats(storyPrompts, commits),
    diagnostics: { ...parsed.diagnostics, excludedByFilter: parsed.prompts.length - kept.length },
  };
  return { story, redactionHits: hits };
}

export interface BuildOptions {
  /** Any path inside the repo. Default: the current directory. */
  repo?: string;
  sessionsDir?: string;
  projectsDir?: string;
  filters: StoryFilters;
  redact: boolean;
  title?: string;
  now?: Date;
}

/** Locate → parse → git log → assemble, for a repo on disk. */
export async function buildStoryFromRepo(options: BuildOptions): Promise<Assembled & { located: LocatedSessions }> {
  const repoRoot = await findRepoRoot(options.repo ?? ".");
  const located = await locateSessions({ repoRoot, sessionsDir: options.sessionsDir, projectsDir: options.projectsDir });
  const [parsed, commits, remoteUrl] = await Promise.all([
    parseSessionFiles(located.files, repoRoot),
    readGitLog(repoRoot),
    readRemoteUrl(repoRoot),
  ]);
  const assembled = assembleStory({
    repoName: basename(repoRoot),
    remoteUrl,
    title: options.title,
    parsed,
    commits,
    filters: options.filters,
    redact: options.redact,
    now: options.now ?? new Date(),
  });
  return { ...assembled, located };
}
