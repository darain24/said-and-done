// Copies the single-file web build to dist/story-template.html, failing the
// build if the template couldn't be injected safely (ARCHITECTURE §8, NFR-1, NFR-2).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const PLACEHOLDER = "__SAID_STORY__";
const MAX_BYTES = 400 * 1024;

const source = new URL("../web/dist/index.html", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);

const html = readFileSync(source, "utf8");
const bytes = Buffer.byteLength(html);
const problems: string[] = [];

const placeholders = html.split(PLACEHOLDER).length - 1;
if (placeholders !== 1) problems.push(`expected the ${PLACEHOLDER} placeholder exactly once, found ${placeholders}`);
if (!html.includes('http-equiv="Content-Security-Policy"')) problems.push("the Content-Security-Policy meta tag is missing");
if (/<script[^>]*\ssrc=/i.test(html) || /<link[^>]*rel="stylesheet"/i.test(html)) problems.push("some scripts or styles were not inlined");
if (!html.includes("--color-canvas")) problems.push("the design tokens are missing from the CSS");
if (bytes > MAX_BYTES) problems.push(`template is ${(bytes / 1024).toFixed(1)} KB, over the ${MAX_BYTES / 1024} KB budget`);

if (problems.length > 0) {
  console.error(`Story template check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir);
writeFileSync(new URL("story-template.html", distDir), html);
console.log(`dist/story-template.html  ${(bytes / 1024).toFixed(1)} KB`);
