import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { encodeProjectPath, locateSessions, NoSessionsError } from "../src/sessions/locate.js";

function setup(t: { after: (fn: () => void) => void }) {
  const projects = mkdtempSync(join(tmpdir(), "said-projects-"));
  t.after(() => rmSync(projects, { recursive: true, force: true }));
  const write = (folder: string, file: string, cwd: string) => {
    mkdirSync(join(projects, folder), { recursive: true });
    writeFileSync(join(projects, folder, file), `${JSON.stringify({ type: "queue-operation" })}\n${JSON.stringify({ type: "user", cwd })}\n`);
    return join(projects, folder, file);
  };
  return { projects, write };
}

test("FR-1: encodes every non-alphanumeric character as -", () => {
  assert.equal(encodeProjectPath("/Users/x/Study/Ai/hhgoa_task4"), "-Users-x-Study-Ai-hhgoa-task4");
  assert.equal(encodeProjectPath("/home/x/said-and-done"), "-home-x-said-and-done");
});

test("FR-1: finds session files in the encoded project folder", async (t) => {
  const { projects, write } = setup(t);
  const b = write("-work-my-app", "b.jsonl", "/work/my_app");
  const a = write("-work-my-app", "a.jsonl", "/work/my_app");
  write("-work-my-app", "notes.txt", "/work/my_app");
  write("-work-other", "c.jsonl", "/work/my_app"); // not searched: the folder was found

  const located = await locateSessions({ repoRoot: "/work/my_app", projectsDir: projects });
  assert.deepEqual(located.files, [a, b]);
  assert.equal(located.how, "project folder");
});

test("FR-1: without the folder, searches every project for a cwd inside the repo", async (t) => {
  const { projects, write } = setup(t);
  const moved = write("-somewhere-else", "moved.jsonl", "/work/my_app/web");
  write("-somewhere-else", "unrelated.jsonl", "/work/my_app-2");

  const located = await locateSessions({ repoRoot: "/work/my_app", projectsDir: projects });
  assert.deepEqual(located.files, [moved]);
  assert.equal(located.how, "search");
});

test("FR-1: --sessions-dir overrides both, and nothing found is a NoSessionsError", async (t) => {
  const { projects, write } = setup(t);
  const file = write("custom", "s.jsonl", "/anything");

  const located = await locateSessions({ repoRoot: "/work/my_app", sessionsDir: join(projects, "custom"), projectsDir: "/nope" });
  assert.deepEqual(located.files, [file]);

  await assert.rejects(locateSessions({ repoRoot: "/work/missing", projectsDir: projects }), (error: unknown) => {
    assert.ok(error instanceof NoSessionsError);
    assert.deepEqual(error.searched, [join(projects, "-work-missing"), projects]);
    return true;
  });
});
