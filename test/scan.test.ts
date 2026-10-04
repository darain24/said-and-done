import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { formatDuration } from "../src/format.js";
import type { Story } from "../src/story/model.js";
import { capture, sessionsFixture } from "./helpers/cli.js";

const fixture = (t: Parameters<typeof sessionsFixture>[0]) => {
  const f = sessionsFixture(t);
  return { ...f, args: ["scan", ...f.flags] };
};

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
