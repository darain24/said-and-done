import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { build } from "../src/commands/build.js";
import { TemplateError } from "../src/render/inject.js";
import type { Story } from "../src/story/model.js";
import { capture, sessionsFixture } from "./helpers/cli.js";

const TEMPLATE = `<!doctype html><html><head><title>Build Story</title></head><body>
<script id="story-data" type="application/json">__SAID_STORY__</script>
<script type="module">/* app */</script></body></html>`;

const BREAKOUT = "</script><script>alert(1)</script> and <!-- this";

function setup(t: Parameters<typeof sessionsFixture>[0]) {
  const f = sessionsFixture(t);
  const dir = mkdtempSync(join(tmpdir(), "said-build-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const template = join(dir, "story-template.html");
  writeFileSync(template, TEMPLATE);
  // One more spoken prompt, trying to close the data tag.
  appendFileSync(join(f.sessions, "voice.jsonl"), `\n${JSON.stringify({
    type: "user", sessionId: "voice-1111", cwd: f.repo.root, timestamp: "2026-10-04T10:30:00.000Z",
    uuid: crypto.randomUUID(), promptId: crypto.randomUUID(), message: { role: "user", content: BREAKOUT },
  })}`);
  return { ...f, out: join(dir, "story.html"), templates: [pathToFileURL(template)] };
}

const readStory = (html: string) =>
  JSON.parse(/<script id="story-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1]!) as Story;

test("FR-31: build writes the page with the story injected and safe", async (t) => {
  const { flags, out, templates } = setup(t);
  const c = capture();
  assert.equal(await build([...flags, "--out", out, "--title", "Said & Done"], c.io, templates), EXIT.ok);

  const html = readFileSync(out, "utf8");
  assert.equal(html.match(/<\/script/g)?.length, 2, "the prompt adds no closing script tags");
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /__SAID_STORY__/);

  const story = readStory(html);
  assert.equal(story.title, "Said & Done");
  assert.equal(story.prompts.length, 4);
  assert.equal(story.prompts.at(-1)!.text, BREAKOUT);
  assert.doesNotMatch(html, /jane@example\.com/);

  const printed = c.out.join("\n");
  assert.match(printed, /Redacted: email 1\n {2}#\d+ {2}Add a CLI that says hello to \[redacted:email\]/);
  assert.match(printed, new RegExp(`Wrote ${out.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} {2}\\(4 prompts, 2 commits\\)$`));
  assert.ok(printed.indexOf("Redacted:") < printed.indexOf("Wrote "), "preview comes before the path (FR-21)");
});

test("FR-22: --no-redact keeps the text and warns", async (t) => {
  const { flags, out, templates } = setup(t);
  const c = capture();
  assert.equal(await build([...flags, "--out", out, "--no-redact"], c.io, templates), EXIT.ok);
  const story = readStory(readFileSync(out, "utf8"));
  assert.equal(story.redacted, false);
  assert.match(story.prompts.map((p) => p.text).join("\n"), /jane@example\.com/);
  assert.match(c.out.join("\n"), /Warning: redaction is off/);
});

test("§11: a missing template fails before writing anything", async (t) => {
  const { flags, out } = setup(t);
  await assert.rejects(build([...flags, "--out", out], capture().io, [new URL("file:///nonexistent/t.html")]), TemplateError);
  assert.throws(() => readFileSync(out));
});

test("FR-35: build --help lists its options", async () => {
  const c = capture();
  assert.equal(await run(["build", "--help"], c.io), EXIT.ok);
  assert.match(c.out.join("\n"), /--out <path>[\s\S]*--title <text>[\s\S]*--no-redact/);
});
