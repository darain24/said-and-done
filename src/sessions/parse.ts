// Reads Claude Code session JSONL into human prompts and file touches
// (FR-2 to FR-5, FR-7; rules in ARCHITECTURE §4.2). Never throws on bad
// input: anything it can't use is counted in the diagnostics instead.
import { createReadStream } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";

export interface RawPrompt {
  /** promptId, or uuid when there's no promptId. The dedupe key. */
  id: string;
  uuid: string;
  sessionId: string;
  at: string;
  text: string;
  images: number;
  /** Raw promptSource. Informational only: it can't tell speech from typing. */
  source?: string;
}

export interface FileTouch {
  promptId: string;
  sessionId: string;
  at: string;
  /** Relative to the repo root, with "/" separators. */
  path: string;
  tool: string;
}

export interface ParseDiagnostics {
  files: number;
  lines: number;
  malformed: number;
  ignoredByType: Record<string, number>;
  sidechain: number;
  outOfRepo: number;
  meta: number;
  toolResults: number;
  wrappers: number;
  empty: number;
  duplicatePrompts: number;
  touchesOutsideRepo: number;
  touchesWithoutPrompt: number;
}

export interface ParseResult {
  prompts: RawPrompt[];
  touches: FileTouch[];
  diagnostics: ParseDiagnostics;
}

/** User entries starting with these are Claude Code plumbing, not something the user said. */
export const WRAPPER_PREFIXES = [
  "<command-name>",
  "<command-message>",
  "<local-command-stdout>",
  "<local-command-caveat>",
  "<bash-input>",
  "<bash-stdout>",
  "<system-reminder>",
  "[Request interrupted",
];

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;

type Entry = Record<string, unknown>;
const isRecord = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);

/** Resolves like path.resolve, but treats a leading "~" as the home folder. */
function resolvePath(base: string, path: string): string {
  return resolve(base, path === "~" || path.startsWith("~/") ? homedir() + path.slice(1) : path);
}

export function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** Feed lines in file order with line(), then call finish(). Exposed for tests. */
export function createParser(repoRoot: string) {
  const root = resolvePath(".", repoRoot);
  const prompts: RawPrompt[] = [];
  const touches: FileTouch[] = [];
  const seenPrompts = new Set<string>();
  const seenTouches = new Set<string>();
  const lastPromptBySession = new Map<string, string>();
  const d: ParseDiagnostics = {
    files: 0, lines: 0, malformed: 0, ignoredByType: {}, sidechain: 0, outOfRepo: 0, meta: 0,
    toolResults: 0, wrappers: 0, empty: 0, duplicatePrompts: 0, touchesOutsideRepo: 0, touchesWithoutPrompt: 0,
  };

  function line(raw: string): void {
    if (raw.trim() === "") return;
    d.lines++;

    let entry: unknown;
    try {
      entry = JSON.parse(raw);
    } catch {
      d.malformed++;
      return;
    }
    if (!isRecord(entry)) {
      d.malformed++;
      return;
    }

    const type = typeof entry.type === "string" ? entry.type : "(missing)";
    if (type !== "user" && type !== "assistant") {
      d.ignoredByType[type] = (d.ignoredByType[type] ?? 0) + 1;
      return;
    }
    if (entry.isSidechain === true) {
      d.sidechain++;
      return;
    }
    // Checked per entry, not per file: sessions move between projects and subfolders.
    const { cwd, sessionId, timestamp } = entry;
    if (typeof cwd !== "string" || !isInside(root, resolvePath(".", cwd))) {
      d.outOfRepo++;
      return;
    }
    if (typeof sessionId !== "string" || typeof timestamp !== "string") {
      d.malformed++;
      return;
    }

    if (type === "user") readUser(entry, sessionId, timestamp);
    else readAssistant(entry, cwd, sessionId, timestamp);
  }

  function readUser(entry: Entry, sessionId: string, at: string): void {
    if (entry.isMeta === true) {
      d.meta++;
      return;
    }
    const content = isRecord(entry.message) && entry.message.role === "user" ? entry.message.content : undefined;

    let text: string;
    let images = 0;
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const blocks = content.filter(isRecord);
      if (blocks.some((b) => b.type === "tool_result")) {
        d.toolResults++;
        return;
      }
      const texts = blocks.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text as string);
      if (texts.length === 0) {
        d.empty++;
        return;
      }
      text = texts.join("\n");
      images = blocks.filter((b) => b.type === "image").length;
    } else {
      d.malformed++;
      return;
    }

    const trimmed = text.trim();
    if (WRAPPER_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      d.wrappers++;
      return;
    }
    const clean = trimmed.replace(SYSTEM_REMINDER, "").trim();
    if (clean === "") {
      d.empty++;
      return;
    }

    const uuid = typeof entry.uuid === "string" ? entry.uuid : "";
    const id = typeof entry.promptId === "string" ? entry.promptId : uuid;
    if (id === "") {
      d.malformed++;
      return;
    }
    lastPromptBySession.set(sessionId, id);
    if (seenPrompts.has(id)) {
      d.duplicatePrompts++;
      return;
    }
    seenPrompts.add(id);
    prompts.push({
      id, uuid, sessionId, at, text: clean, images,
      ...(typeof entry.promptSource === "string" ? { source: entry.promptSource } : {}),
    });
  }

  function readAssistant(entry: Entry, cwd: string, sessionId: string, at: string): void {
    const content = isRecord(entry.message) && Array.isArray(entry.message.content) ? entry.message.content : [];
    for (const block of content) {
      if (!isRecord(block) || block.type !== "tool_use" || typeof block.name !== "string" || !EDIT_TOOLS.has(block.name)) continue;
      const input = isRecord(block.input) ? block.input : {};
      const target = typeof input.file_path === "string" ? input.file_path : input.notebook_path;
      if (typeof target !== "string") continue;

      const absolute = resolvePath(resolvePath(".", cwd), target);
      if (!isInside(root, absolute)) {
        d.touchesOutsideRepo++;
        continue;
      }
      // Linked to the latest prompt in the same session (ARCHITECTURE §4.2).
      const promptId = lastPromptBySession.get(sessionId);
      if (promptId === undefined) {
        d.touchesWithoutPrompt++;
        continue;
      }
      const path = relative(root, absolute).split(sep).join("/");
      const key = typeof block.id === "string" ? block.id : `${promptId}\0${path}\0${at}`;
      if (seenTouches.has(key)) continue;
      seenTouches.add(key);
      touches.push({ promptId, sessionId, at, path, tool: block.name });
    }
  }

  function finish(): ParseResult {
    // Array sort is stable, so equal timestamps keep file order.
    const byTime = (a: { at: string }, b: { at: string }) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
    return { prompts: [...prompts].sort(byTime), touches: [...touches].sort(byTime), diagnostics: d };
  }

  return { line, finish, diagnostics: d };
}

/** Streams each session file line by line. Files are read in the order given. */
export async function parseSessionFiles(files: string[], repoRoot: string): Promise<ParseResult> {
  const parser = createParser(repoRoot);
  for (const file of files) {
    parser.diagnostics.files++;
    const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
    for await (const raw of lines) parser.line(raw);
  }
  return parser.finish();
}
