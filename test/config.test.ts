import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { ConfigError, loadConfig } from "../src/config.js";
import type { Story } from "../src/story/model.js";
import { capture, sessionsFixture } from "./helpers/cli.js";

function tempDir(t: { after: (fn: () => void) => void }) {
  const dir = mkdtempSync(join(tmpdir(), "said-config-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("config: no said.config.json at the repo root means no defaults", async (t) => {
  assert.deepEqual(await loadConfig(tempDir(t)), { config: {} });
});

test("config: a --config file that doesn't exist is an error", async (t) => {
  await assert.rejects(loadConfig(tempDir(t), join(tempDir(t), "nope.json")), ConfigError);
});

test("config: invalid JSON, unknown keys and wrong types are explained", async (t) => {
  const dir = tempDir(t);
  const file = join(dir, "said.config.json");

  writeFileSync(file, "{ title: ");
  await assert.rejects(loadConfig(dir), /isn't valid JSON/);

  writeFileSync(file, JSON.stringify({ titel: "x" }));
  await assert.rejects(loadConfig(dir), /unknown key "titel"\. Known keys: title,/);

  writeFileSync(file, JSON.stringify({ title: 3 }));
  await assert.rejects(loadConfig(dir), /"title" should be a string/);

  writeFileSync(file, JSON.stringify({ excludeSessions: "abc" }));
  await assert.rejects(loadConfig(dir), /"excludeSessions" should be a list/);

  writeFileSync(file, "[]");
  await assert.rejects(loadConfig(dir), /should hold a JSON object/);
});

test("config: paths are resolved against the config file's folder; $schema is allowed", async (t) => {
  const dir = tempDir(t);
  mkdirSync(join(dir, "conf"));
  const file = join(dir, "conf", "said.json");
  writeFileSync(file, JSON.stringify({ $schema: "x", sessionsDir: "../sessions", out: "story.html", badgeOut: "/abs/badge.svg", title: "T" }));
  const { config, path } = await loadConfig(dir, file);
  assert.equal(path, file);
  assert.deepEqual(config, { title: "T", sessionsDir: join(dir, "sessions"), out: join(dir, "conf", "story.html"), badgeOut: "/abs/badge.svg" });
});

test("config: scan reads said.config.json at the repo root; flags add to it and win", async (t) => {
  const f = sessionsFixture(t);
  writeFileSync(
    join(f.repo.root, "said.config.json"),
    JSON.stringify({ sessionsDir: f.sessions, excludeSessions: ["typed"], title: "From config", since: "2026-10-04T00:00:00Z" }),
  );

  const c = capture();
  assert.equal(await run(["scan", "--repo", f.repo.root, "--json"], c.io), EXIT.ok);
  const story = JSON.parse(c.out.join("\n")) as Story;
  assert.equal(story.title, "From config");
  assert.deepEqual(story.filters.excludedSessions, ["typed"]);
  assert.equal(story.stats.prompts, 2);

  const later = capture();
  assert.equal(await run(["scan", "--repo", f.repo.root, "--json", "--since", "2026-10-04T10:10:00Z", "--exclude-session", "voice"], later.io), EXIT.ok);
  const filtered = JSON.parse(later.out.join("\n")) as Story;
  assert.deepEqual(filtered.filters.excludedSessions, ["typed", "voice"]);
  assert.equal(filtered.filters.since, "2026-10-04T10:10:00.000Z");
  assert.equal(filtered.stats.prompts, 0);
});

test("config: a broken config file exits with the usage code and names the file", async (t) => {
  const f = sessionsFixture(t);
  writeFileSync(join(f.repo.root, "said.config.json"), JSON.stringify({ nope: true }));
  const c = capture();
  assert.equal(await run(["scan", ...f.flags], c.io), EXIT.usage);
  assert.match(c.err.join("\n"), /said\.config\.json has unknown key "nope"/);
});

test("config: said.config.schema.json describes exactly the keys the CLI accepts", async () => {
  const schema = JSON.parse(readFileSync(new URL("../said.config.schema.json", import.meta.url), "utf8")) as { properties: Record<string, unknown> };
  const dir = mkdtempSync(join(tmpdir(), "said-config-"));
  try {
    const all = Object.fromEntries(Object.keys(schema.properties).map((k) => [k, k === "excludeSessions" ? [] : "x"]));
    writeFileSync(join(dir, "said.config.json"), JSON.stringify(all));
    await loadConfig(dir);
    writeFileSync(join(dir, "said.config.json"), JSON.stringify({ ...all, extra: 1 }));
    await assert.rejects(loadConfig(dir), /unknown key "extra"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
