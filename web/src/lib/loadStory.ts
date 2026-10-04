// Reads the Story from the page's data tag (ARCHITECTURE §8).
import type { Story } from "../../../src/story/model";

export type Loaded = { ok: true; story: Story } | { ok: false };

export function parseStory(text: string): Loaded {
  try {
    const data = JSON.parse(text) as Partial<Story> | null;
    if (data?.schemaVersion !== 1 || !Array.isArray(data.prompts) || !Array.isArray(data.commits) || !Array.isArray(data.sessions)) {
      return { ok: false };
    }
    return { ok: true, story: data as Story };
  } catch {
    return { ok: false };
  }
}

export async function loadStory(): Promise<Loaded> {
  const text = document.getElementById("story-data")?.textContent ?? "";
  // The dev server serves the template with the placeholder still in it, so
  // use the sample instead. This branch is removed from production builds.
  if (import.meta.env.DEV && !text.trimStart().startsWith("{")) {
    const sample = await import("../../story.sample.json?raw");
    return parseStory(sample.default);
  }
  return parseStory(text);
}
