import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { GitCommit } from "../src/git/log.js";
import { parseSessionFiles } from "../src/sessions/parse.js";
import { type AssembleInput, assembleStory } from "../src/story/assemble.js";
import { countWords } from "../src/story/stats.js";

const REPO = "~/Documents/Study/Ai/said-and-done";
const VOICE = fileURLToPath(new URL("./fixtures/voice-session.jsonl", import.meta.url));
const RELOCATED = fileURLToPath(new URL("./fixtures/relocated-session.jsonl", import.meta.url));

const commit = (sha: string, at: string, paths: string[], subject = sha): GitCommit => ({
  sha, at, subject, files: paths.map((path) => ({ path, added: 2, removed: 1 })), added: 2 * paths.length, removed: paths.length,
});

async function input(overrides: Partial<AssembleInput> = {}): Promise<AssembleInput> {
  return {
    repoName: "said-and-done",
    parsed: await parseSessionFiles([RELOCATED, VOICE], REPO),
    commits: [],
    filters: { excludedSessions: [] },
    redact: true,
    now: new Date("2026-10-04T12:00:00.000Z"),
    ...overrides,
  };
}

test("PRD §8: words skip redaction placeholders", () => {
  assert.equal(countWords("  email [redacted:email] about ~/app  now\n"), 4);
  assert.equal(countWords(""), 0);
});

test("FR-6: --since, --until and --exclude-session drop prompts before anything else", async () => {
  const all = assembleStory(await input()).story;
  assert.equal(all.prompts.length, 7);

  const voiceOnly = assembleStory(await input({ filters: { excludedSessions: ["061228f9"] } })).story;
  assert.equal(voiceOnly.prompts.length, 5, "a session id prefix is enough");
  assert.equal(voiceOnly.diagnostics.excludedByFilter, 2);
  assert.deepEqual(voiceOnly.prompts.map((p) => p.n), [1, 2, 3, 4, 5]);

  const window = assembleStory(await input({ filters: { since: "2026-10-03T06:13:00.000Z", until: "2026-10-03T06:17:59.000Z", excludedSessions: [] } })).story;
  assert.deepEqual(window.prompts.map((p) => p.text.slice(0, 12)), ["Set up a rep", "Show me runn"]);
  assert.equal(window.diagnostics.excludedByFilter, 5);
});

test("FR-11 + PRD §8: prompts, commits, sessions and stats fit together", async () => {
  const parsed = await parseSessionFiles([VOICE], REPO);
  const [first, second, third, fourth] = parsed.prompts.map((p) => Date.parse(p.at));
  const iso = (ms: number) => new Date(ms).toISOString();
  const { story } = assembleStory(await input({
    parsed,
    commits: [
      commit("aaa", iso(first! - 60_000), ["docs/PLAN.md"]),
      commit("bbb", iso(third! + 60_000), ["src/cli.ts", "package.json"], "Scaffold for /Users/jane/app"),
      commit("ccc", iso(fourth! + 30_000), ["README.md"]),
    ],
  }));

  assert.deepEqual(story.commits.map((c) => [c.sha, c.confidence, c.promptNs]), [
    ["aaa", "none", []],
    ["bbb", "files", [1, 2, 3]],
    ["ccc", "time", [4]],
  ]);
  assert.equal(story.commits[1]!.subject, "Scaffold for ~/app", "commit subjects are redacted");
  assert.deepEqual(story.prompts.map((p) => p.commitSha), ["bbb", "bbb", "bbb", "ccc", null]);
  assert.deepEqual(story.prompts[2]!.files, ["src/cli.ts", "test/cli.test.ts", "CLAUDE.md"]);
  assert.deepEqual(story.sessions.map((s) => s.promptCount), [5]);

  const s = story.stats;
  assert.equal(s.prompts, 5);
  assert.equal(s.words, story.prompts.reduce((sum, p) => sum + p.words, 0));
  assert.equal(s.sessions, 1);
  assert.equal(s.commits, 3);
  assert.equal(s.filesTouched, 5);
  assert.equal(s.firstPromptToFirstCommitMs, third! + 60_000 - first!, "the first commit linked to a prompt, not commit aaa");
  assert.equal(s.longestPrompt?.n, 3);
  assert.equal(s.typingSavedMs, Math.round((s.words / 40 - s.words / 150) * 60_000));
  assert.ok(second! - first! <= 20 * 60_000 && s.activeMs > 0);
});

test("PRD §8: active time ignores gaps over 20 minutes", async () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 4, 10, minute)).toISOString();
  const prompts = [0, 5, 45, 50].map((minute, i) => ({ id: `p${i}`, uuid: `p${i}`, sessionId: "s", at: at(minute), text: "hi", images: 0 }));
  const parsed = { prompts, touches: [], diagnostics: (await input()).parsed.diagnostics };
  assert.equal(assembleStory(await input({ parsed })).story.stats.activeMs, 10 * 60_000);
});

test("NFR-5: same inputs give the same story", async () => {
  const a = assembleStory(await input({ commits: [commit("x", "2026-10-03T06:20:00.000Z", ["src/cli.ts"])] }));
  const b = assembleStory(await input({ commits: [commit("x", "2026-10-03T06:20:00.000Z", ["src/cli.ts"])] }));
  assert.equal(JSON.stringify(a.story), JSON.stringify(b.story));
  assert.equal(a.story.schemaVersion, 1);
  assert.equal(a.story.redacted, true);
});
