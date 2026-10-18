import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { EXIT, run } from "../src/cli.js";
import { doctor, formatChecks, runChecks } from "../src/commands/doctor.js";
import { HOOK_COMMAND, SETTINGS_PATH } from "../src/commands/hook.js";
import { capture, sessionsFixture } from "./helpers/cli.js";
import { makeTempRepo } from "./helpers/git-repo.js";

function template(t: { after: (fn: () => void) => void }) {
  const dir = mkdtempSync(join(tmpdir(), "said-doctor-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "story-template.html");
  writeFileSync(file, "<html>__SAID_STORY__</html>");
  return { dir, templates: [pathToFileURL(file)] };
}

const byLabel = (checks: Awaited<ReturnType<typeof runChecks>>) => Object.fromEntries(checks.map((c) => [c.label, c]));

test("doctor: a working setup passes every check and exits 0", async (t) => {
  const f = sessionsFixture(t);
  const { templates } = template(t);
  const c = capture();
  assert.equal(await doctor([...f.flags], c.io, { templates }), EXIT.ok);
  const out = c.out.join("\n");
  assert.match(out, /✓ Node {6}v\d+/);
  assert.match(out, /✓ Repo/);
  assert.match(out, /✓ Commits {3}2/);
  assert.match(out, /✓ Sessions {2}2 session files \(sessions dir\)/);
  assert.match(out, /! Prompts {3}3 found, 1 malformed lines skipped/);
  assert.match(out, /✓ Template/);
  assert.match(out, /· Hook {6}not installed/);
  assert.match(out, /Ready, with 1 warning\./);
});

test("doctor: old Node, a broken config and a missing template fail with fixes", async (t) => {
  const f = sessionsFixture(t);
  writeFileSync(join(f.repo.root, "said.config.json"), "{");
  const checks = byLabel(
    await runChecks({ repo: f.repo.root, sessionsDir: f.sessions, nodeVersion: "20.11.0", templates: [pathToFileURL(join(f.sessions, "missing.html"))] }),
  );
  assert.equal(checks.Node!.status, "fail");
  assert.match(checks.Node!.fix!, /Node 22/);
  assert.equal(checks.Config!.status, "fail");
  assert.match(checks.Config!.detail, /isn't valid JSON/);
  assert.equal(checks.Template!.status, "fail");
  assert.match(checks.Template!.fix!, /npm run build/);
});

test("doctor: outside a git repo it stops after the repo check and exits 5", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "said-norepo-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const c = capture();
  assert.equal(await run(["doctor", "--repo", dir], c.io), EXIT.checks);
  const out = c.out.join("\n");
  assert.match(out, /✗ Repo {6}not inside a git repo\n {4}→ Run said from inside the repo/);
  assert.doesNotMatch(out, /Sessions/);
  assert.match(out, /1 problem to fix\./);
});

test("doctor: no sessions is a failure that names where it looked", async (t) => {
  const repo = makeTempRepo();
  t.after(() => repo.remove());
  const projects = mkdtempSync(join(tmpdir(), "said-projects-"));
  t.after(() => rmSync(projects, { recursive: true, force: true }));
  const { templates } = template(t);
  const checks = byLabel(await runChecks({ repo: repo.root, projectsDir: projects, templates }));
  assert.equal(checks.Commits!.status, "warn");
  assert.equal(checks.Sessions!.status, "fail");
  assert.match(checks.Sessions!.detail, new RegExp(`none found in .*${projects.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("doctor: sees an installed hook", async (t) => {
  const f = sessionsFixture(t);
  mkdirSync(join(f.repo.root, ".claude"));
  writeFileSync(join(f.repo.root, SETTINGS_PATH), JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [{ type: "command", command: HOOK_COMMAND }] }] } }));
  const { templates } = template(t);
  assert.equal(byLabel(await runChecks({ repo: f.repo.root, sessionsDir: f.sessions, templates })).Hook!.status, "ok");
});

test("doctor: the home folder is shown as ~ so the output can be shared", () => {
  const lines = formatChecks([{ status: "ok", label: "Repo", detail: "/Users/jane/code/app" }], "/Users/jane");
  assert.equal(lines[2], "  ✓ Repo      ~/code/app");
  assert.equal(lines.at(-1), "All good. Run said build.");
});
