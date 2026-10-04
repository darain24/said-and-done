import assert from "node:assert/strict";
import { test } from "node:test";
import { type GitCommit, readGitLog } from "../src/git/log.js";
import { type Correlation, correlate } from "../src/story/correlate.js";
import { makeTempRepo } from "./helpers/git-repo.js";

const prompt = (id: string, at: string) => ({ id, at: `2026-10-04T${at}Z` });
const touch = (promptId: string, path: string) => ({ promptId, path });
const commit = (sha: string, at: string, paths: string[]): GitCommit => ({
  sha, at: `2026-10-04T${at}Z`, subject: sha,
  files: paths.map((path) => ({ path, added: 1, removed: 0 })), added: paths.length, removed: 0,
});

/** "sha: confidence [prompt ids]" per commit, plus "uncommitted [ids]". */
function summary({ commits, commitByPrompt }: Correlation): string[] {
  const uncommitted = [...commitByPrompt].filter(([, sha]) => sha === null).map(([id]) => id);
  return [...commits.map((c) => `${c.sha}: ${c.confidence} [${c.promptIds.join(" ")}]`), `uncommitted [${uncommitted.join(" ")}]`];
}

test("FR-11: each commit takes the prompts since the previous commit", () => {
  const result = correlate(
    [prompt("p1", "10:00:00.000"), prompt("p2", "10:05:00.000"), prompt("p3", "10:10:00.000"), prompt("p4", "10:30:00.000")],
    [touch("p1", "src/a.ts"), touch("p3", "docs/notes.md")],
    [commit("c0", "09:00:00", ["README.md"]), commit("c1", "10:06:00", ["src/a.ts"]), commit("c2", "10:12:00", ["src/b.ts"]), commit("c3", "10:20:00", ["x"])],
  );
  assert.deepEqual(summary(result), [
    "c0: none []", // before any prompt, still kept
    "c1: files [p1 p2]", // p1's edit to src/a.ts is in the commit
    "c2: time [p3]", // p3 edited a different file
    "c3: none []",
    "uncommitted [p4]",
  ]);
});

test("FR-11: one overlapping file is enough for files confidence", () => {
  const result = correlate(
    [prompt("p1", "10:00:00.000"), prompt("p2", "10:01:00.000")],
    [touch("p1", "notes.md"), touch("p2", "src/a.ts"), touch("p2", "src/b.ts")],
    [commit("c1", "10:02:00", ["src/b.ts", "package.json"])],
  );
  assert.deepEqual(summary(result), ["c1: files [p1 p2]", "uncommitted []"]);
});

test("FR-11: a prompt in the same second as the commit counts as before it", () => {
  const result = correlate([prompt("p1", "10:06:00.400")], [], [commit("c1", "10:06:00", [])]);
  assert.deepEqual(summary(result), ["c1: time [p1]", "uncommitted []"]);
});

test("FR-11: input order doesn't matter, and no commits means all uncommitted", () => {
  const prompts = [prompt("p2", "10:05:00.000"), prompt("p1", "10:00:00.000")];
  const commits = [commit("c2", "10:06:00", []), commit("c1", "10:01:00", [])];
  assert.deepEqual(summary(correlate(prompts, [], commits)), ["c1: time [p1]", "c2: time [p2]", "uncommitted []"]);
  assert.deepEqual(summary(correlate(prompts, [], [])), ["uncommitted [p1 p2]"]);
});

test("FR-10/FR-11: links prompts to a real repo's commits across time zones", async (t) => {
  const repo = makeTempRepo();
  t.after(repo.remove);
  // Commits in IST, prompts in UTC, as Claude Code writes them.
  const setup = repo.commit("2026-10-04T15:00:00+05:30", "Scaffold", { "src/cli.ts": "x\n" });
  const parser = repo.commit("2026-10-04T15:40:00+05:30", "Add parser", { "src/parse.ts": "y\n" });

  const prompts = [prompt("scaffold", "09:20:00.000"), prompt("parser", "10:05:00.000"), prompt("commit-it", "10:09:30.000"), prompt("later", "11:00:00.000")];
  const result = correlate(prompts, [touch("parser", "src/parse.ts")], await readGitLog(repo.root));

  assert.deepEqual(summary(result), [`${setup}: time [scaffold]`, `${parser}: files [parser commit-it]`, "uncommitted [later]"]);
});
