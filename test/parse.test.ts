import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { redactText } from "../src/redact.js";
import { createParser, type ParseResult, parseSessionFiles } from "../src/sessions/parse.js";

// Fixtures are trimmed, redacted extracts of this project's own sessions, made
// with scripts/make-fixture.ts. Redaction turned the home folder into "~", so
// the repo root is written the same way here.
const REPO = "~/Documents/Study/Ai/said-and-done";
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const RELOCATED = fixture("relocated-session.jsonl");
const VOICE = fixture("voice-session.jsonl");

/** Touches as "path ← first words of the prompt", for readable assertions. */
function touchSummary({ prompts, touches }: ParseResult): string[] {
  const textOf = new Map(prompts.map((p) => [p.id, p.text]));
  return touches.map((t) => `${t.path} ← ${textOf.get(t.promptId)?.slice(0, 20)}`);
}

test("FR-2/FR-3: relocated session keeps only in-repo human prompts", async () => {
  const result = await parseSessionFiles([RELOCATED], REPO);

  assert.deepEqual(
    result.prompts.map((p) => p.text.slice(0, 31)),
    ["Commit the working tree changes", "so before going ahead i want to"],
  );
  assert.deepEqual(touchSummary(result), ["PLAN.md ← so before going ahea", "PLAN.md ← so before going ahea"]);

  const d = result.diagnostics;
  assert.equal(d.outOfRepo, 6, "entries from before the session moved into this repo");
  assert.equal(d.meta, 3, "system reminder, /init expansion, local command caveat");
  assert.equal(d.wrappers, 3, "<bash-input>, <command-message>, <command-name>");
  assert.equal(d.toolResults, 3);
  assert.equal(d.touchesOutsideRepo, 1, "the plan file under ~/.claude");
  assert.deepEqual(d.ignoredByType, { "queue-operation": 2, relocated: 1 });
  assert.equal(d.malformed, 0);
});

test("FR-2/FR-4: voice session keeps prompts from subfolders and links edits", async () => {
  const result = await parseSessionFiles([VOICE], REPO);

  assert.deepEqual(
    result.prompts.map((p) => p.text.slice(0, 26)),
    [
      "Read Claude.md and the doc",
      "Set up project permissions", // asked while cwd was docs/
      "Set up a repo with a TypeS",
      "Show me running the web de",
      "Okay, now run the checks a",
    ],
  );
  assert.ok(result.prompts.every((p) => p.source === "sdk" && p.sessionId === result.prompts[0]!.sessionId));
  assert.deepEqual(touchSummary(result), [
    ".claude/settings.json ← Set up project permi",
    "src/cli.ts ← Set up a repo with a",
    "test/cli.test.ts ← Set up a repo with a",
    "CLAUDE.md ← Set up a repo with a",
    ".claude/launch.json ← Show me running the ",
  ]);

  const d = result.diagnostics;
  assert.equal(d.meta, 1, "the expanded skill text");
  assert.equal(d.toolResults, 5);
  assert.equal(d.outOfRepo, 0);
  assert.deepEqual(d.ignoredByType, { "queue-operation": 1, attachment: 1, "last-prompt": 1 });
});

test("FR-7: reading the same sessions twice gives the same story", async () => {
  const once = await parseSessionFiles([RELOCATED, VOICE], REPO);
  const twice = await parseSessionFiles([RELOCATED, VOICE, VOICE, RELOCATED], REPO);
  assert.deepEqual(twice.prompts, once.prompts);
  assert.deepEqual(twice.touches, once.touches);
  assert.equal(twice.diagnostics.duplicatePrompts, once.prompts.length);
  assert.deepEqual(once.prompts.map((p) => p.at), [...once.prompts.map((p) => p.at)].sort());
});

test("NFR-7: fixtures contain nothing left to redact", () => {
  for (const file of [RELOCATED, VOICE]) {
    for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
      const { hits } = redactText(JSON.stringify(JSON.parse(line)));
      assert.deepEqual(Object.values(hits), [0, 0, 0, 0, 0], `unredacted data in ${file}`);
    }
  }
});

// Rules the real sessions don't happen to exercise, with hand-written lines.
test("FR-5: odd and excluded entries are counted, never thrown", () => {
  const root = "/work/app";
  const base = { sessionId: "s1", cwd: root, timestamp: "2026-10-04T10:00:00.000Z" };
  const user = (content: unknown, extra: object = {}) =>
    JSON.stringify({ ...base, type: "user", uuid: crypto.randomUUID(), message: { role: "user", content }, ...extra });
  const edit = (file_path: string, extra: object = {}) =>
    JSON.stringify({ ...base, type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Edit", input: { file_path } }] }, ...extra });

  const parser = createParser(root);
  for (const line of [
    edit("/work/app/early.ts"), // before any prompt
    "{not json",
    "[1,2]",
    JSON.stringify({ type: "mystery-type" }),
    user("from a sub-agent", { isSidechain: true }),
    user("no cwd", { cwd: undefined }),
    user("sibling folder", { cwd: "/work/app-2" }),
    user([{ type: "text", text: "[Request interrupted by user]" }]),
    user("<system-reminder>only a reminder</system-reminder>"),
    user([{ type: "image" }]),
    user([{ type: "text", text: "Look at this <system-reminder>noise</system-reminder> screenshot" }, { type: "image" }], { promptId: "p1" }),
    user("a later prompt", { cwd: "/work/app/web/src", promptId: "p2" }),
    edit("lib/util.ts", { cwd: "/work/app/web" }), // relative to the entry's cwd
    edit("/etc/hosts"),
    "",
  ]) parser.line(line);
  const { prompts, touches, diagnostics: d } = parser.finish();

  assert.deepEqual(prompts.map((p) => [p.id, p.text, p.images]), [
    ["p1", "Look at this  screenshot", 1],
    ["p2", "a later prompt", 0],
  ]);
  assert.deepEqual(touches.map((t) => [t.promptId, t.path]), [["p2", "web/lib/util.ts"]]);
  assert.deepEqual(
    { lines: d.lines, malformed: d.malformed, sidechain: d.sidechain, outOfRepo: d.outOfRepo, wrappers: d.wrappers, empty: d.empty },
    { lines: 14, malformed: 2, sidechain: 1, outOfRepo: 2, wrappers: 2, empty: 1 },
  );
  assert.deepEqual(d.ignoredByType, { "mystery-type": 1 });
  assert.equal(d.touchesWithoutPrompt, 1);
  assert.equal(d.touchesOutsideRepo, 1);
});
