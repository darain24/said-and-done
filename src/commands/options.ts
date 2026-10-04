// Options shared by the commands that build a Story (scan, build).
import type { StoryFilters } from "../story/model.js";

export class UsageError extends Error {}

export const STORY_OPTIONS = {
  repo: { type: "string" },
  "sessions-dir": { type: "string" },
  since: { type: "string" },
  until: { type: "string" },
  "exclude-session": { type: "string", multiple: true },
  help: { type: "boolean", short: "h" },
} as const;

export const STORY_OPTIONS_HELP = `  --repo <path>              Repo to read (default: the current directory)
  --sessions-dir <path>      Read session files from this folder instead
  --since <ISO date>         Leave out prompts before this time
  --until <ISO date>         Leave out prompts after this time
  --exclude-session <id>     Leave out a session; repeatable, an id prefix is enough`;

export function readFilters(values: { since?: string; until?: string; "exclude-session"?: string[] }): StoryFilters {
  const since = parseDate(values.since, "--since");
  const until = parseDate(values.until, "--until");
  return {
    ...(since ? { since } : {}),
    ...(until ? { until } : {}),
    excludedSessions: values["exclude-session"] ?? [],
  };
}

function parseDate(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new UsageError(`${flag} needs a date like 2026-10-03 or 2026-10-03T06:00:00Z, not "${value}".`);
  return new Date(ms).toISOString();
}
