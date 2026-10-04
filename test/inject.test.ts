import assert from "node:assert/strict";
import { test } from "node:test";
import { injectStory, readTemplate, serializeStory, TemplateError } from "../src/render/inject.js";
import type { Story } from "../src/story/model.js";

const TEMPLATE = `<!doctype html><html><body><div id="root"></div>
<script id="story-data" type="application/json">__SAID_STORY__</script>
<script type="module">/* app */</script></body></html>`;

const BREAKOUT = "</script><script>alert(1)</script>";

function storyWith(...texts: string[]): Story {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-04T10:00:00.000Z",
    generator: { name: "said-and-done", version: "0.1.0" },
    repo: { name: "demo" },
    title: "demo",
    redacted: true,
    filters: { excludedSessions: [] },
    sessions: [],
    prompts: texts.map((text, i) => ({
      n: i + 1,
      id: `p${i + 1}`,
      sessionId: "s1",
      at: "2026-10-04T10:00:00.000Z",
      text,
      words: text.split(/\s+/).length,
      files: [],
      commitSha: null,
    })),
    commits: [],
    stats: {
      prompts: texts.length, words: 0, sessions: 1, commits: 0, filesTouched: 0, activeMs: 0,
      firstPromptToFirstCommitMs: null, longestPrompt: null, typingSavedMs: 0,
    },
    diagnostics: {} as Story["diagnostics"],
  };
}

/** What a browser hands to JSON.parse: everything up to the first closing script tag. */
function readDataTag(html: string): Story {
  const match = /<script id="story-data" type="application\/json">([\s\S]*?)<\/script>/i.exec(html);
  assert.ok(match, "data tag not found");
  return JSON.parse(match[1]!) as Story;
}

const closingTags = (html: string) => html.match(/<\/script/gi)?.length ?? 0;

test("§9: a prompt containing </script> can't break out of the data tag", () => {
  const story = storyWith(BREAKOUT, "<!-- comment start", "</SCRIPT >and <ScRiPt>");
  const html = injectStory(TEMPLATE, story);

  assert.equal(closingTags(html), closingTags(TEMPLATE), "exactly one closing tag for the data script");
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html.slice(html.indexOf("story-data")), /<!--/);
  assert.deepEqual(readDataTag(html), story, "the story round-trips unchanged");
});

test("§9: every < is written as \\u003c, and line separators are escaped", () => {
  const json = serializeStory(storyWith("a < b", "line\u2028sep\u2029para"));
  assert.doesNotMatch(json, /</);
  assert.doesNotMatch(json, /[\u2028\u2029]/);
  assert.match(json, /a \\u003c b/);
  assert.equal(JSON.parse(json).prompts[1].text, "line\u2028sep\u2029para");
});

test("§9: $-patterns in a prompt are copied as written", () => {
  const story = storyWith("cost is $& or $1 or $$ or $`");
  assert.equal(readDataTag(injectStory(TEMPLATE, story)).prompts[0]!.text, "cost is $& or $1 or $$ or $`");
});

test("§9: a template without exactly one placeholder is refused", () => {
  assert.throws(() => injectStory("<html></html>", storyWith()), TemplateError);
  assert.throws(() => injectStory(TEMPLATE + TEMPLATE, storyWith()), /found it 2 times/);
});

test("§11: a missing template says to run the build", async () => {
  await assert.rejects(readTemplate([new URL("file:///nonexistent/story-template.html")]), (error: Error) => {
    assert.ok(error instanceof TemplateError);
    assert.match(error.message, /npm run build/);
    return true;
  });
});
