import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Story } from "../src/story/model.js";
import { computeStats } from "../src/story/stats.js";
import { revealedN, statsAt, tickMs } from "../web/src/lib/replay.js";
import { commitAnchors } from "../web/src/lib/timeline.js";

const story = JSON.parse(readFileSync(new URL("../web/story.sample.json", import.meta.url), "utf8")) as Story;
const anchors = commitAnchors(story);

test("FR-47: tick length is clamp(1.2 s, 0.6 s + 12 ms × words, 4 s), divided by speed", () => {
  assert.equal(tickMs(0, 1), 1200);
  assert.equal(tickMs(100, 1), 1800);
  assert.equal(tickMs(1000, 1), 4000);
  assert.equal(tickMs(100, 2), 900);
  assert.equal(tickMs(1000, 4), 1000);
});

test("FR-47: revealedN is the newest prompt showing", () => {
  assert.equal(revealedN(story, 0), 0);
  assert.equal(revealedN(story, 1), story.prompts[0]!.n);
  assert.equal(revealedN(story, story.prompts.length), story.prompts.at(-1)!.n);
});

test("FR-47: stats at prompt 0 count only commits made before any prompt", () => {
  const stats = statsAt(story, anchors, 0);
  assert.equal(stats.prompts, 0);
  assert.equal(stats.words, 0);
  assert.equal(stats.commits, story.commits.filter((c) => anchors.get(c.sha) === 0).length);
});

test("FR-47: stats grow with the cursor and end at the full totals", () => {
  let previous = statsAt(story, anchors, 0);
  for (let cursor = 1; cursor <= story.prompts.length; cursor++) {
    const stats = statsAt(story, anchors, cursor);
    assert.equal(stats.prompts, cursor);
    assert.ok(stats.words >= previous.words && stats.commits >= previous.commits && stats.activeMs >= previous.activeMs);
    previous = stats;
  }
  assert.deepEqual(previous, computeStats(story.prompts, story.commits));
});

test("FR-47: a commit appears with the last prompt that led to it", () => {
  for (const commit of story.commits.filter((c) => c.promptNs.length > 0)) {
    assert.equal(anchors.get(commit.sha), Math.max(...commit.promptNs));
  }
});
