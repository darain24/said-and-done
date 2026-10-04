import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { badgeSvg, promptCountText } from "../src/render/badge-svg.js";
import { capture, sessionsFixture } from "./helpers/cli.js";

/** Every tag opens and closes in order (a cheap well-formedness check; no XML parser in Node). */
function assertBalanced(svg: string) {
  const stack: string[] = [];
  for (const [, close, name, selfClosing] of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (selfClosing) continue;
    if (close) assert.equal(stack.pop(), name, `</${name}> closes the wrong tag`);
    else stack.push(name!);
  }
  assert.deepEqual(stack, [], "unclosed tags");
}

test("FR-33: the count reads naturally", () => {
  const table: [number, string][] = [
    [0, "0 prompts"],
    [1, "1 prompt"],
    [42, "42 prompts"],
    [1234, "1,234 prompts"],
  ];
  for (const [n, expected] of table) assert.equal(promptCountText(n), expected);
});

test("FR-33: the badge is valid SVG reading 'built by voice' and the count", () => {
  const svg = badgeSvg(42);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /);
  assert.match(svg, /<title>built by voice: 42 prompts<\/title>/);
  assert.match(svg, /role="img" aria-label="built by voice: 42 prompts"/);
  assert.match(svg, />built by voice<\/text>/);
  assert.match(svg, />42 prompts<\/text>/);
  assertBalanced(svg);
});

test("FR-33: no external references", () => {
  const svg = badgeSvg(7);
  const urls = svg.match(/https?:\/\/[^"]+/g) ?? [];
  assert.deepEqual(urls, ["http://www.w3.org/2000/svg"], "only the SVG namespace");
  assert.doesNotMatch(svg, /href|<image|<script|<style|@import|<foreignObject/);
});

test("FR-33: segment widths are 7 px per character plus padding", () => {
  const width = (svg: string) => Number(/<svg[^>]* width="(\d+)"/.exec(svg)![1]);
  // "built by voice" is 14 characters → 110 px; "1 prompt" is 8 → 68 px.
  assert.equal(width(badgeSvg(1)), 110 + 68);
  assert.equal(width(badgeSvg(1234)) - width(badgeSvg(12)), 3 * 7, "three more characters");
  assert.match(badgeSvg(1), /<rect x="110" width="68" height="20"/);
});

test("FR-33: the same count gives the same bytes", () => {
  assert.equal(badgeSvg(99), badgeSvg(99));
});

test("FR-33: said badge writes the SVG and prints the README line", async (t) => {
  const { flags, repo } = sessionsFixture(t);
  mkdirSync(join(repo.root, "docs"));
  const out = join(repo.root, "docs", "said-badge.svg");
  const c = capture();

  assert.equal(await run(["badge", ...flags, "--out", out], c.io), EXIT.ok);
  assert.equal(readFileSync(out, "utf8"), badgeSvg(3));
  assert.deepEqual(c.out, [
    `Wrote ${out}  (3 prompts)`,
    "",
    "Add this line to your README:",
    "  ![built by voice: 3 prompts](docs/said-badge.svg)",
  ]);
});

test("FR-33: said badge uses the same filters as scan", async (t) => {
  const { flags } = sessionsFixture(t);
  const dir = mkdtempSync(join(tmpdir(), "said-badge-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = join(dir, "badge.svg");

  const c = capture();
  assert.equal(await run(["badge", ...flags, "--out", out, "--exclude-session", "typed"], c.io), EXIT.ok);
  assert.match(readFileSync(out, "utf8"), /built by voice: 2 prompts/);
});

test("FR-33: said badge explains a bad --out", async (t) => {
  const { flags } = sessionsFixture(t);
  const c = capture();
  assert.equal(await run(["badge", ...flags, "--out", "/no/such/folder/badge.svg"], c.io), EXIT.usage);
  assert.match(c.err.join("\n"), /Couldn't write .*badge\.svg.*Check that --out points into a folder that exists/);
});
