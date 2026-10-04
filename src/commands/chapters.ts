// `said chapters` (FR-32, ARCHITECTURE §10): YouTube chapter lines for the build video,
// one per commit made while recording. Only the git log is needed, not the sessions.
import { parseArgs } from "node:util";
import type { Io } from "../cli.js";
import { EXIT } from "../exit.js";
import { findRepoRoot, readGitLog } from "../git/log.js";
import { UsageError } from "./options.js";

export const CHAPTERS_HELP = `Usage: said chapters --start <ISO time> [options]

Print YouTube chapter lines for the build video: one per commit made while
recording, titled from the commit subject. Paste them into the description.

YouTube's rules are applied: the first chapter is at 0:00, there are at least
3 chapters, and each lasts at least 10 seconds (shorter ones are merged into
the next).

Options:
  --start <ISO time>         When the recording started (required)
  --end <ISO time>           When it ended (default: no limit)
  --repo <path>              Repo to read (default: the current directory)
  -h, --help                 Show this help

Example:
  said chapters --start 2026-10-03T10:00:00 --end 2026-10-03T13:30:00`;

export const MIN_CHAPTER_MS = 10_000;
export const MIN_CHAPTERS = 3;
const MAX_TITLE = 60;

export interface Chapter {
  /** Milliseconds from the start of the video. */
  offsetMs: number;
  title: string;
}

/** There aren't enough commits in the window for YouTube to show chapters. */
export class TooFewChaptersError extends Error {}

/**
 * "FR-40–FR-46, FR-48: Build Story page" → "Build Story page": requirement IDs
 * are noise in a chapter list. Cut to 60 characters at a word boundary.
 */
export function chapterTitle(subject: string): string {
  const title = subject.replace(/^[A-Z]+-\d+(?:\s*[,–-]\s*[A-Z]+-\d+)*\s*:\s*/, "").replace(/\s+/g, " ").trim() || subject.trim();
  if (title.length <= MAX_TITLE) return title;
  const cut = title.slice(0, MAX_TITLE - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > MAX_TITLE / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

/** "0:00", "4:05", "1:02:09" (m:ss under an hour, h:mm:ss from an hour). */
export function formatOffset(ms: number): string {
  const total = Math.floor(ms / 1000);
  const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * An "Intro" chapter at 0:00, then one chapter per commit with start ≤ at ≤ end,
 * at its offset into the video. A chapter under 10 s is merged with the one
 * after it: the merged chapter keeps the earlier time and the later title.
 * The last chapter only has a known length when `endMs` is given.
 */
export function makeChapters(commits: { at: string; subject: string }[], startMs: number, endMs?: number): Chapter[] {
  const inWindow = commits
    .map((c) => ({ offsetMs: Date.parse(c.at) - startMs, title: chapterTitle(c.subject) }))
    .filter((c) => c.offsetMs >= 0 && (endMs === undefined || c.offsetMs <= endMs - startMs))
    .sort((a, b) => a.offsetMs - b.offsetMs);

  const chapters: Chapter[] = [{ offsetMs: 0, title: "Intro" }, ...inWindow];
  const lengthOf = (i: number) => {
    const next = chapters[i + 1]?.offsetMs ?? (endMs === undefined ? Infinity : endMs - startMs);
    return next - chapters[i]!.offsetMs;
  };

  let i = 0;
  while (i < chapters.length) {
    if (lengthOf(i) >= MIN_CHAPTER_MS) {
      i++;
    } else if (i + 1 < chapters.length) {
      // Merge into the next: it starts here instead.
      chapters[i + 1]!.offsetMs = chapters[i]!.offsetMs;
      chapters.splice(i, 1);
    } else if (i > 0) {
      // A short last chapter: the previous one runs to the end and takes its title.
      chapters[i - 1]!.title = chapters[i]!.title;
      chapters.splice(i, 1);
      i--;
    } else {
      break;
    }
  }

  if (chapters.length < MIN_CHAPTERS) {
    const found = inWindow.length === 1 ? "1 commit" : `${inWindow.length} commits`;
    throw new TooFewChaptersError(
      `YouTube needs at least ${MIN_CHAPTERS} chapters of 10 seconds or more, and this gives ${chapters.length} ` +
        `(${found} between the start and end times). Check --start and --end, or commit more often while recording.`,
    );
  }
  return chapters;
}

function parseTime(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new UsageError(`${flag} needs a time like 2026-10-03T10:00:00 or 2026-10-03T10:00:00Z, not "${value}".`);
  return ms;
}

export async function chapters(argv: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      start: { type: "string" },
      end: { type: "string" },
      repo: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    io.out(CHAPTERS_HELP);
    return EXIT.ok;
  }

  const startMs = parseTime(values.start, "--start");
  if (startMs === undefined) throw new UsageError("--start is required: the time the recording started.");
  const endMs = parseTime(values.end, "--end");
  if (endMs !== undefined && endMs <= startMs) throw new UsageError("--end must be after --start.");

  const commits = await readGitLog(await findRepoRoot(values.repo ?? "."));
  try {
    for (const c of makeChapters(commits, startMs, endMs)) io.out(`${formatOffset(c.offsetMs)} ${c.title}`);
  } catch (error) {
    if (!(error instanceof TooFewChaptersError)) throw error;
    io.err(error.message);
    return EXIT.usage;
  }
  return EXIT.ok;
}
