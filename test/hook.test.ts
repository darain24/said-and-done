import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { addHook, hook, HOOK_COMMAND, lineDiff, recordPrompt, removeHook } from "../src/commands/hook.js";
import { capture } from "./helpers/cli.js";
import { makeTempRepo } from "./helpers/git-repo.js";

const OURS = { hooks: [{ type: "command", command: HOOK_COMMAND }] };
const OTHER = { hooks: [{ type: "command", command: "echo hi" }] };

function repoWithSettings(t: { after: (fn: () => void) => void }, settings?: string) {
  const repo = makeTempRepo();
  t.after(() => repo.remove());
  const path = join(repo.root, ".claude", "settings.json");
  if (settings !== undefined) {
    mkdirSync(join(repo.root, ".claude"));
    writeFileSync(path, settings);
  }
  return { root: repo.root, path, read: () => readFileSync(path, "utf8") };
}

test("FR-34: addHook adds one UserPromptSubmit group and keeps everything else", () => {
  assert.deepEqual(addHook({}), { hooks: { UserPromptSubmit: [OURS] } });
  const settings = { permissions: { allow: ["Bash(npm *)"] }, hooks: { UserPromptSubmit: [OTHER], Stop: [OTHER] } };
  assert.deepEqual(addHook(settings), {
    permissions: { allow: ["Bash(npm *)"] },
    hooks: { UserPromptSubmit: [OTHER, OURS], Stop: [OTHER] },
  });
  assert.deepEqual(settings.hooks.UserPromptSubmit, [OTHER], "the input isn't changed");
});

test("FR-34: addHook is a no-op when the hook is already there, even inside another group", () => {
  assert.equal(addHook({ hooks: { UserPromptSubmit: [OURS] } }), null);
  assert.equal(addHook({ hooks: { UserPromptSubmit: [{ hooks: [...OTHER.hooks, ...OURS.hooks] }] } }), null);
});

test("FR-34: removeHook removes only ours and tidies up what's left empty", () => {
  assert.deepEqual(removeHook({ hooks: { UserPromptSubmit: [OURS] } }), {});
  assert.deepEqual(removeHook({ permissions: {}, hooks: { UserPromptSubmit: [OURS], Stop: [OTHER] } }), { permissions: {}, hooks: { Stop: [OTHER] } });
  assert.deepEqual(removeHook({ hooks: { UserPromptSubmit: [{ hooks: [...OTHER.hooks, ...OURS.hooks] }] } }), { hooks: { UserPromptSubmit: [OTHER] } });
  assert.equal(removeHook({ hooks: { UserPromptSubmit: [OTHER] } }), null);
  assert.equal(removeHook({}), null);
});

test("FR-34: settings of an unexpected shape are refused, not rewritten", () => {
  assert.throws(() => addHook({ hooks: [] }), /"hooks" .* isn't an object/);
  assert.throws(() => addHook({ hooks: { UserPromptSubmit: {} } }), /isn't a list/);
});

test("FR-34: lineDiff shows changed lines with two lines of context", () => {
  const before = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n");
  const after = ["a", "b", "c", "d", "e", "f", "g", "X", "h"].join("\n");
  assert.deepEqual(lineDiff(before, after), ["  f", "  g", "+ X", "  h"]);
  assert.deepEqual(lineDiff("one\ntwo\n", "one\n"), ["  one", "- two"]);
  assert.deepEqual(lineDiff("", "{}\n"), ["+ {}"]);
  assert.deepEqual(lineDiff("x\n", "x\n"), []);
  // Two changes far apart are separated by an ellipsis.
  const long = Array.from({ length: 12 }, (_, i) => `l${i}`);
  const edited = [...long];
  edited[1] = "A";
  edited[10] = "B";
  assert.deepEqual(lineDiff(long.join("\n"), edited.join("\n")), ["  l0", "- l1", "+ A", "  l2", "  l3", "  …", "  l8", "  l9", "- l10", "+ B", "  l11"]);
});

test("FR-34: hook install creates the settings file and prints what it added", async (t) => {
  const { root, read } = repoWithSettings(t);
  const c = capture();
  assert.equal(await run(["hook", "install", "--repo", root], c.io), EXIT.ok);

  assert.deepEqual(JSON.parse(read()), { hooks: { UserPromptSubmit: [OURS] } });
  assert.equal(c.out[0], "Created .claude/settings.json:");
  assert.ok(c.out.slice(1).filter((l) => l.startsWith("  ")).every((l) => l.startsWith("  + ")), "every line is an addition");
  assert.ok(c.out.includes(`  +             "command": "${HOOK_COMMAND}"`));
});

test("FR-34: hook install keeps existing settings, and a second run changes nothing", async (t) => {
  const original = `${JSON.stringify({ permissions: { allow: ["Bash(git *)"] } }, null, 2)}\n`;
  const { root, read } = repoWithSettings(t, original);

  const first = capture();
  assert.equal(await run(["hook", "install", "--repo", root], first.io), EXIT.ok);
  assert.equal(first.out[0], "Updated .claude/settings.json:");
  const diff = first.out.filter((l) => /^ {2}[+-] /.test(l));
  assert.ok(diff.length > 0 && diff.every((l) => l.startsWith("  + ") || l === "  -   }"), diff.join("\n"));
  const installed = read();
  assert.deepEqual(JSON.parse(installed).permissions, { allow: ["Bash(git *)"] });

  const second = capture();
  assert.equal(await run(["hook", "install", "--repo", root], second.io), EXIT.ok);
  assert.deepEqual(second.out, ["The hook is already in .claude/settings.json. Nothing changed."]);
  assert.equal(read(), installed);

  const removed = capture();
  assert.equal(await run(["hook", "uninstall", "--repo", root], removed.io), EXIT.ok);
  assert.equal(removed.out[0], "Updated .claude/settings.json:");
  assert.equal(read(), original, "uninstall restores the file exactly");

  const again = capture();
  assert.equal(await run(["hook", "uninstall", "--repo", root], again.io), EXIT.ok);
  assert.deepEqual(again.out, ["There's no said hook in .claude/settings.json. Nothing changed."]);
});

test("FR-34: invalid settings JSON is left alone", async (t) => {
  const { root, read } = repoWithSettings(t, "{ not json");
  const c = capture();
  assert.equal(await run(["hook", "install", "--repo", root], c.io), EXIT.usage);
  assert.match(c.err.join("\n"), /isn't valid JSON, so said left it alone/);
  assert.equal(read(), "{ not json");
});

test("FR-34: record appends the prompt to a git-ignored ledger and prints nothing", async (t) => {
  const { root } = repoWithSettings(t);
  mkdirSync(join(root, "src"));
  const event = (prompt: string) => JSON.stringify({ session_id: "s-1", cwd: join(root, "src"), hook_event_name: "UserPromptSubmit", prompt });

  assert.equal(await recordPrompt(event("Add a CLI"), new Date("2026-10-04T10:00:00Z")), true);
  const c = capture();
  assert.equal(await hook(["record"], c.io, async () => event("Now add tests")), EXIT.ok);
  assert.deepEqual(c.out, [], "stdout would be added to the prompt");

  const ledger = readFileSync(join(root, ".said", "ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(ledger[0], { at: "2026-10-04T10:00:00.000Z", sessionId: "s-1", text: "Add a CLI" });
  assert.equal(ledger[1].text, "Now add tests");
  assert.equal(readFileSync(join(root, ".said", ".gitignore"), "utf8"), "*\n");
});

test("FR-34: record skips empty prompts and never exits with 2 (which would block the prompt)", async (t) => {
  const { root } = repoWithSettings(t);
  assert.equal(await recordPrompt(JSON.stringify({ cwd: root, prompt: "  " })), false);

  const c = capture();
  const code = await hook(["record"], c.io, async () => "not json");
  assert.notEqual(code, 2);
  assert.deepEqual(c.out, []);
  assert.match(c.err.join("\n"), /^said hook record: /);
});

test("FR-35: said hook with no action shows help; an unknown action is a usage error", async () => {
  const help = capture();
  assert.equal(await run(["hook"], help.io), EXIT.ok);
  assert.match(help.out.join("\n"), /Example:\n {2}said hook install/);

  const bad = capture();
  assert.equal(await run(["hook", "instal"], bad.io), EXIT.usage);
  assert.match(bad.err.join("\n"), /Unknown hook action "instal"/);
});
