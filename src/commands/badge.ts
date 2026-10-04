// `said badge` (FR-33): writes the "built by voice" SVG for the README and prints
// the Markdown line that shows it.
import { writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Io } from "../cli.js";
import { EXIT } from "../exit.js";
import { findRepoRoot } from "../git/log.js";
import { badgeSvg, BADGE_LABEL, promptCountText } from "../render/badge-svg.js";
import { buildStoryFromRepo } from "../story/assemble.js";
import { readFilters, STORY_OPTIONS, STORY_OPTIONS_HELP, UsageError } from "./options.js";

export const BADGE_HELP = `Usage: said badge [options]

Write a "built by voice │ N prompts" SVG badge for the README, and print the
Markdown line to paste in. The count matches said scan with the same filters.

Options:
${STORY_OPTIONS_HELP}
  --out <path>               Where to write the badge (default: said-badge.svg)
  -h, --help                 Show this help

Example:
  said badge --since 2026-10-03T06:00:00Z --out docs/said-badge.svg`;

export async function badge(argv: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { ...STORY_OPTIONS, out: { type: "string" } },
  });
  if (values.help) {
    io.out(BADGE_HELP);
    return EXIT.ok;
  }

  const filters = readFilters(values);
  const { story } = await buildStoryFromRepo({
    repo: values.repo,
    sessionsDir: values["sessions-dir"],
    filters,
    redact: true,
  });

  const out = resolve(values.out ?? "said-badge.svg");
  try {
    await writeFile(out, badgeSvg(story.stats.prompts));
  } catch (error) {
    throw new UsageError(`Couldn't write ${out}: ${(error as Error).message}. Check that --out points into a folder that exists.`);
  }

  // The README sits at the repo root, so the image path is relative to that.
  const fromReadme = relative(await findRepoRoot(values.repo ?? "."), out).split("\\").join("/");
  const count = promptCountText(story.stats.prompts);
  io.out(`Wrote ${out}  (${count})`);
  io.out("");
  io.out("Add this line to your README:");
  io.out(`  ![${BADGE_LABEL}: ${count}](${fromReadme})`);
  return EXIT.ok;
}
