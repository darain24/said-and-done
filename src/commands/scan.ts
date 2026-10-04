// `said scan` (FR-30): a summary to check the data before building.
import { parseArgs } from "node:util";
import type { Io } from "../cli.js";
import { EXIT } from "../exit.js";
import { formatCount, formatDuration, formatTime, localTimeZone, preview } from "../format.js";
import type { RedactionHits } from "../redact.js";
import type { LocatedSessions } from "../sessions/locate.js";
import { buildStoryFromRepo } from "../story/assemble.js";
import type { Story } from "../story/model.js";
import { readFilters, STORY_OPTIONS, STORY_OPTIONS_HELP } from "./options.js";

export const SCAN_HELP = `Usage: said scan [options]

Summarise the Claude Code sessions and git commits found for this repo.

Options:
${STORY_OPTIONS_HELP}
  --json                     Print the story JSON instead of the summary
  -h, --help                 Show this help

Example:
  said scan --since 2026-10-03T06:00:00Z --exclude-session 061228f9`;

export async function scan(argv: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { ...STORY_OPTIONS, json: { type: "boolean" } },
  });
  if (values.help) {
    io.out(SCAN_HELP);
    return EXIT.ok;
  }

  const { story, redactionHits, located } = await buildStoryFromRepo({
    repo: values.repo,
    sessionsDir: values["sessions-dir"],
    filters: readFilters(values),
    redact: true,
  });

  io.out(values.json ? JSON.stringify(story, null, 2) : formatScan(story, located, redactionHits).join("\n"));
  return EXIT.ok;
}

const row = (label: string, value: string, note = "") => `  ${label.padEnd(30)}${value.padStart(7)}${note ? `   ${note}` : ""}`;

export function formatScan(story: Story, located: LocatedSessions, hits: RedactionHits, timeZone = localTimeZone()): string[] {
  const { stats, prompts, commits, diagnostics: d, filters } = story;
  const linked = commits.filter((c) => c.promptNs.length > 0).length;
  const out: string[] = [`said scan · ${story.repo.name}`, ""];

  out.push(row("Prompts", formatCount(stats.prompts), `${formatCount(stats.words)} words`));
  out.push(row("Sessions", formatCount(stats.sessions), `from ${formatCount(located.files.length)} session files (${located.how})`));
  out.push(row("Commits", formatCount(stats.commits), `${formatCount(linked)} linked to prompts`));
  out.push(row("Files touched", formatCount(stats.filesTouched)));
  if (prompts.length > 0) {
    const span = `${formatTime(prompts[0]!.at, timeZone)} → ${formatTime(prompts.at(-1)!.at, timeZone)}`;
    out.push(row("Time span", "", `${span} (${timeZone})`));
  }
  out.push(row("Active time", formatDuration(stats.activeMs)));
  out.push(row("First prompt → first commit", stats.firstPromptToFirstCommitMs === null ? "—" : formatDuration(stats.firstPromptToFirstCommitMs)));

  if (story.sessions.length > 0) {
    out.push("", "Sessions");
    for (const s of story.sessions) {
      out.push(`  ${s.id.slice(0, 8)}   ${formatTime(s.start, timeZone)} → ${formatTime(s.end, timeZone)}   ${s.promptCount} ${s.promptCount === 1 ? "prompt" : "prompts"}`);
    }
  }

  if (prompts.length > 0) {
    out.push("", "Prompts");
    const width = String(prompts.length).length;
    for (const p of prompts) {
      out.push(`  ${String(p.n).padStart(width)}  ${formatTime(p.at, timeZone)}  ${preview(p.text, 64).padEnd(64)}  ${p.commitSha?.slice(0, 7) ?? "—"}`);
    }
  }

  out.push("", "Filters");
  const active = [
    filters.since && `since ${filters.since}`,
    filters.until && `until ${filters.until}`,
    filters.excludedSessions.length > 0 && `excluding ${filters.excludedSessions.join(", ")}`,
  ].filter(Boolean);
  out.push(active.length > 0 ? `  ${active.join(" · ")}` : "  none");
  out.push(row("Prompts left out by filters", formatCount(d.excludedByFilter)));

  out.push("", "Skipped while reading");
  const types = Object.entries(d.ignoredByType).sort((a, b) => b[1] - a[1]);
  const typeTotal = types.reduce((sum, [, n]) => sum + n, 0);
  out.push(row("Unrecognised entry types", formatCount(typeTotal), types.slice(0, 4).map(([t, n]) => `${t} ${n}`).join(", ") + (types.length > 4 ? ", …" : "")));
  out.push(row("Malformed lines", formatCount(d.malformed)));
  out.push(row("Outside this repo", formatCount(d.outOfRepo)));
  out.push(row("Tool results", formatCount(d.toolResults)));
  out.push(row("Commands and system text", formatCount(d.wrappers + d.meta + d.empty)));
  out.push(row("Sub-agent (sidechain)", formatCount(d.sidechain)));

  const redacted = Object.entries(hits).filter(([, n]) => n > 0).map(([kind, n]) => `${kind} ${n}`);
  out.push("", `Redacted: ${redacted.length > 0 ? redacted.join(", ") : "nothing found"}`);
  return out;
}
