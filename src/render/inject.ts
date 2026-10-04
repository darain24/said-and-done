// Injection (ARCHITECTURE §9): the Story goes into the template's
// <script id="story-data" type="application/json"> tag, escaped so no prompt
// text can close the tag or start an HTML comment.
import { readFile } from "node:fs/promises";
import type { Story } from "../story/model.js";

export const PLACEHOLDER = "__SAID_STORY__";

export class TemplateError extends Error {}

/** JSON that is safe inside a script tag: `<`, U+2028 and U+2029 are written as \u escapes. */
export function serializeStory(story: Story): string {
  return JSON.stringify(story)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function injectStory(template: string, story: Story): string {
  const count = template.split(PLACEHOLDER).length - 1;
  if (count !== 1) {
    throw new TemplateError(`The story template is damaged: expected the data placeholder once, found it ${count} times. Rebuild with "npm run build".`);
  }
  const json = serializeStory(story);
  // Function form, so "$&" or "$1" in a prompt is copied as written.
  return template.replace(PLACEHOLDER, () => json);
}

// Built: dist/render/inject.js → dist/story-template.html.
// From source: src/render/inject.ts → dist/story-template.html.
const TEMPLATE_CANDIDATES = [
  new URL("../story-template.html", import.meta.url),
  new URL("../../dist/story-template.html", import.meta.url),
];

export async function readTemplate(candidates: URL[] = TEMPLATE_CANDIDATES): Promise<string> {
  for (const url of candidates) {
    try {
      return await readFile(url, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new TemplateError(`The story template is missing (looked for dist/story-template.html). Run "npm run build" first.`);
}
