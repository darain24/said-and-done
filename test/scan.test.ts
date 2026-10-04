import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { formatDuration } from "../src/format.js";
import type { Story } from "../src/story/model.js";
import { makeTempRepo } from "./helpers/git-repo.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (l: string) => out.push(l), err: (l: string) => err.push(l) } };
}

/** A temp repo with two commits and a sessions folder with two sessions in it. */
function fixture(t: { after: (fn: () => void) => void }) {
  const repo = makeTempRepo();
  const sessions = mkdtempSync(join(tmpdir(), "said-sessions-"));
  t.after(() => {
    repo.remove();
    rmSync(sessions, { recursive: true, force: true });
  });

  const sha = repo.commit("2026-10-04T10:10:00Z", "Add the CLI", { "src/cli.ts": "x\n" });
  repo.commit("2026-10-04T08:00:00Z", "Before recording", { "README.md": "r\n" });

  const line = (sessionId: string, at: string, extra: object) =>
    JSON.stringify({ sessionId, cwd: repo.root, timestamp: `2026-10-04T${at}Z`, uuid: crypto.randomUUID(), ...extra });
  const prompt = (sessionId: string, at: string, text: string) =>
    line(sessionId, at, { type: "user", promptId: crypto.randomUUID(), message: { role: "user", content: text } });
  const write = (at: string, file: string) =>
    line("voice-1111", at, { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: crypto.randomUUID(), name: "Write", input: { file_path: join(repo.root, file) } }] } });

  writeFileSync(join(sessions, "typed.jsonl"), [
    prompt("typed-2222", "09:00:00.000", "planning notes, typed"),
    JSON.stringify({ type: "custom-title" }),
  ].join("\n"));
  writeFileSync(join(sessions, "voice.jsonl"), [
    prompt("voice-1111", "10:00:00.000", "Add a CLI that says hello to jane@example.com"),
    write("10:01:00.000", "src/cli.ts"),
    "{broken",
    prompt("voice-1111", "10:20:00.000", "Now add tests"),
  ].join("\n"));

  return { repo, sessions, sha, args: ["scan", "--repo", repo.root, "--sessions-dir", sessions] };
}

test("FR-30: scan prints the summary and the prompts", async (t) => {
  const { args, sha } = fixture(t);
  const c = capture();
  assert.equal(await run(args, c.io), EXIT.ok);
  const out = c.out.join("\n");

  assert.match(out, /Prompts\s+3\s+13 words/);
  assert.match(out, /Sessions\s+2\s+from 2 session files \(sessions dir\)/);
  assert.match(out, /Commits\s+2\s+1 linked to prompts/);
  assert.match(out, /Files touched\s+1/);
  assert.match(out, new RegExp(`Add a CLI that says hello to \\[redacted:email\\]\\s+${sha.slice(0, 7)}`));
  assert.match(out, /Now add tests\s+—/);
  assert.match(out, /Unrecognised entry types\s+1\s+custom-title 1/);
  assert.match(out, /Malformed lines\s+1/);
  assert.match(out, /Redacted: email 1/);
  assert.doesNotMatch(out, /jane@example\.com/);
});

test("FR-6/FR-30: --since and --exclude-session leave prompts out and say so", async (t) => {
  const { args } = fixture(t);
  const c = capture();
  assert.equal(await run([...args, "--exclude-session", "typed", "--since", "2026-10-04T10:10:00Z"], c.io), EXIT.ok);
  const out = c.out.join("\n");

  assert.match(out, /Prompts\s+1\s+3 words/);
  assert.match(out, /since 2026-10-04T10:10:00\.000Z · excluding typed/);
  assert.match(out, /Prompts left out by filters\s+2/);
  assert.doesNotMatch(out, /planning notes/);
});

test("FR-30: --json prints the story", async (t) => {
  const { args } = fixture(t);
  const c = capture();
  assert.equal(await run([...args, "--json"], c.io), EXIT.ok);
  const story = JSON.parse(c.out.join("\n")) as Story;
  assert.equal(story.schemaVersion, 1);
  assert.equal(story.prompts.length, 3);
  assert.deepEqual(story.commits.map((c) => c.subject), ["Before recording", "Add the CLI"]);
});

test("FR-35: scan's usage errors and exit codes", async (t) => {
  const { args, repo } = fixture(t);

  const badDate = capture();
  assert.equal(await run([...args, "--since", "yesterday-ish"], badDate.io), EXIT.usage);
  assert.match(badDate.err.join("\n"), /--since needs a date/);

  const badFlag = capture();
  assert.equal(await run([...args, "--nope"], badFlag.io), EXIT.usage);
  assert.match(badFlag.err.join("\n"), /Usage: said scan/);

  const empty = mkdtempSync(join(tmpdir(), "said-empty-"));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  const none = capture();
  assert.equal(await run(["scan", "--repo", repo.root, "--sessions-dir", empty], none.io), EXIT.noSessions);
  assert.match(none.err.join("\n"), /No Claude Code sessions found/);

  const notRepo = capture();
  assert.equal(await run(["scan", "--repo", empty], notRepo.io), EXIT.git);

  const help = capture();
  assert.equal(await run(["scan", "--help"], help.io), EXIT.ok);
  assert.match(help.out.join("\n"), /--exclude-session <id>/);
});

test("DESIGN §8: durations read like 45s, 14m, 6h 12m", () => {
  assert.deepEqual([45_000, 14 * 60_000, (6 * 60 + 12) * 60_000, 2 * 3_600_000].map(formatDuration), ["45s", "14m", "6h 12m", "2h"]);
});
