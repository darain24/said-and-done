// `said build` (FR-31): writes the Build Story page, after a redaction preview (FR-21).
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Io } from "../cli.js";
import { EXIT } from "../exit.js";
import { formatCount, preview } from "../format.js";
import { REDACTION_KINDS, type RedactionHits } from "../redact.js";
import { injectStory, readTemplate, TemplateError } from "../render/inject.js";
import { buildStoryFromRepo } from "../story/assemble.js";
import type { Story } from "../story/model.js";
import { readFilters, STORY_OPTIONS, STORY_OPTIONS_HELP, UsageError } from "./options.js";

export const BUILD_HELP = `Usage: said build [options]

Write the Build Story: one HTML page that opens offline.

Options:
${STORY_OPTIONS_HELP}
  --out <path>               Where to write the page (default: build-story.html)
  --title <text>             Page title (default: the repo name)
  --no-redact                Keep keys, emails and home paths as written (not recommended)
  -h, --help                 Show this help

Example:
  said build --title "Said & Done" --since 2026-10-03T06:00:00Z`;

/** `templates` is for tests; by default the packaged dist/story-template.html is used. */
export async function build(argv: string[], io: Io, templates?: URL[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    allowNegative: true,
    options: {
      ...STORY_OPTIONS,
      out: { type: "string" },
      title: { type: "string" },
      redact: { type: "boolean", default: true },
    },
  });
  if (values.help) {
    io.out(BUILD_HELP);
    return EXIT.ok;
  }

  const filters = readFilters(values);
  // Read the template first, so a missing build fails before any work.
  const template = await readTemplate(templates);
  const { story, redactionHits } = await buildStoryFromRepo({
    repo: values.repo,
    sessionsDir: values["sessions-dir"],
    filters,
    redact: values.redact,
    title: values.title,
  });

  const out = resolve(values.out ?? "build-story.html");
  try {
    await writeFile(out, injectStory(template, story));
  } catch (error) {
    if (error instanceof TemplateError) throw error;
    throw new UsageError(`Couldn't write ${out}: ${(error as Error).message}. Check that --out points into a folder that exists.`);
  }

  for (const line of formatRedactionPreview(story, redactionHits)) io.out(line);
  io.out(`Wrote ${out}  (${formatCount(story.stats.prompts)} prompts, ${formatCount(story.stats.commits)} commits)`);
  return EXIT.ok;
}

const SNIPPETS = 3;

/** Counts by type, then the first few redacted lines as they'll appear on the page. */
export function formatRedactionPreview(story: Story, hits: RedactionHits): string[] {
  if (!story.redacted) return ["Warning: redaction is off. Keys, emails and home paths appear on the page as written."];

  const counts = REDACTION_KINDS.filter((kind) => hits[kind] > 0).map((kind) => `${kind} ${hits[kind]}`);
  if (counts.length === 0) return ["Redacted: nothing found"];

  const texts = [
    ...story.prompts.flatMap((p) => [p.text, ...p.files].map((text) => ({ label: `#${p.n}`, text }))),
    ...story.commits.flatMap((c) => [c.subject, ...c.files.map((f) => f.path)].map((text) => ({ label: c.sha.slice(0, 7), text }))),
  ];
  const snippets = [...new Set(texts.filter((t) => t.text.includes("[redacted:")).map((t) => `  ${t.label}  ${around(t.text)}`))];
  return [`Redacted: ${counts.join(", ")}`, ...snippets.slice(0, SNIPPETS)];
}

/** The text from a little before the first placeholder. */
function around(text: string): string {
  const start = Math.max(0, text.indexOf("[redacted:") - 30);
  return `${start > 0 ? "…" : ""}${preview(text.slice(start), 72)}`;
}
