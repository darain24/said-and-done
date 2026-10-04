import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { GitError, readGitLog } from "../src/git/log.js";
import { makeTempRepo } from "./helpers/git-repo.js";

test("FR-10: reads commits oldest first with per-file line stats", async (t) => {
  const repo = makeTempRepo();
  t.after(repo.remove);

  const first = repo.commit("2026-10-04T10:00:00+05:30", "Add readme", { "README.md": "one\ntwo\n" });
  const second = repo.commit("2026-10-04T10:30:00+05:30", "Edit readme, add cli and logo", {
    "README.md": "one\nTWO\nthree\n",
    "src/cli.ts": "a\nb\nc\nd\n",
    "logo.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]),
  });
  repo.commit("2026-10-04T11:00:00Z", "Remove readme", { "README.md": "" });

  const log = await readGitLog(repo.root);

  assert.deepEqual(log.map((c) => [c.sha, c.subject]), [
    [first, "Add readme"],
    [second, "Edit readme, add cli and logo"],
    [log[2]!.sha, "Remove readme"],
  ]);
  assert.deepEqual(log.map((c) => c.at), ["2026-10-04T04:30:00.000Z", "2026-10-04T05:00:00.000Z", "2026-10-04T11:00:00.000Z"]);
  assert.deepEqual(log[1]!.files, [
    { path: "README.md", added: 2, removed: 1 },
    { path: "logo.png", added: 0, removed: 0 }, // binary
    { path: "src/cli.ts", added: 4, removed: 0 },
  ]);
  assert.deepEqual([log[1]!.added, log[1]!.removed], [6, 1]);
  assert.deepEqual(log[2]!.files, [{ path: "README.md", added: 0, removed: 3 }]);
});

test("FR-10: never stores author names or emails", async (t) => {
  const repo = makeTempRepo();
  t.after(repo.remove);
  repo.commit("2026-10-04T10:00:00Z", "Init", { "a.txt": "a\n" });

  const json = JSON.stringify(await readGitLog(repo.root));
  assert.doesNotMatch(json, /example\.test|"Test"/);
});

test("FR-10: a repo with no commits gives an empty list", async (t) => {
  const repo = makeTempRepo();
  t.after(repo.remove);
  assert.deepEqual(await readGitLog(repo.root), []);
});

test("FR-10: a folder that isn't a repo is a GitError", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "said-nogit-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(readGitLog(dir), GitError);
});
