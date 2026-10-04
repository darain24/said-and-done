// `said hook install | uninstall | record` (FR-34, ARCHITECTURE §10): live capture
// through a Claude Code UserPromptSubmit hook in the project's .claude/settings.json.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { text } from "node:stream/consumers";
import { parseArgs } from "node:util";
import type { Io } from "../cli.js";
import { EXIT } from "../exit.js";
import { findRepoRoot } from "../git/log.js";
import { UsageError } from "./options.js";

export const HOOK_HELP = `Usage: said hook <install | uninstall> [options]

Capture prompts live as you work. "install" adds a UserPromptSubmit hook to
the project's .claude/settings.json; each prompt is then appended to
.said/ledger.jsonl, which is kept out of git. "uninstall" removes the hook.
Both print exactly what changed, and running either twice changes nothing.

The hook runs "said hook record", so said must be on your PATH
(npm install -g said-and-done, or npm link in a checkout).

Options:
  --repo <path>              Repo to change (default: the current directory)
  -h, --help                 Show this help

Example:
  said hook install`;

export const HOOK_COMMAND = "said hook record";
export const SETTINGS_PATH = join(".claude", "settings.json");
export const LEDGER_DIR = ".said";
const EVENT = "UserPromptSubmit";

interface HookEntry {
  type?: string;
  command?: string;
  [key: string]: unknown;
}
interface HookGroup {
  hooks?: HookEntry[];
  [key: string]: unknown;
}
type Settings = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The UserPromptSubmit groups, checking the shape on the way so we never rewrite a file we don't understand. */
function eventGroups(settings: Settings): HookGroup[] | undefined {
  const hooks = settings.hooks;
  if (hooks === undefined) return undefined;
  if (!isObject(hooks)) throw new UsageError(`"hooks" in ${SETTINGS_PATH} isn't an object, so said left the file alone.`);
  const groups = hooks[EVENT];
  if (groups === undefined) return undefined;
  if (!Array.isArray(groups)) throw new UsageError(`"hooks.${EVENT}" in ${SETTINGS_PATH} isn't a list, so said left the file alone.`);
  return groups as HookGroup[];
}

const isOurs = (entry: HookEntry) => entry.type === "command" && entry.command === HOOK_COMMAND;

/** Settings with the hook added. Returns null when it's already there. */
export function addHook(settings: Settings): Settings | null {
  const groups = eventGroups(settings) ?? [];
  if (groups.some((g) => Array.isArray(g.hooks) && g.hooks.some(isOurs))) return null;
  const hooks = isObject(settings.hooks) ? settings.hooks : {};
  return { ...settings, hooks: { ...hooks, [EVENT]: [...groups, { hooks: [{ type: "command", command: HOOK_COMMAND }] }] } };
}

/** Settings with the hook removed, tidying away anything left empty. Returns null when it isn't there. */
export function removeHook(settings: Settings): Settings | null {
  const groups = eventGroups(settings);
  if (!groups?.some((g) => Array.isArray(g.hooks) && g.hooks.some(isOurs))) return null;

  const kept = groups
    .map((g) => (Array.isArray(g.hooks) ? { ...g, hooks: g.hooks.filter((h) => !isOurs(h)) } : g))
    .filter((g) => !Array.isArray(g.hooks) || g.hooks.length > 0);
  const { [EVENT]: _removed, ...otherEvents } = settings.hooks as Record<string, unknown>;
  const hooks = kept.length > 0 ? { ...otherEvents, [EVENT]: kept } : otherEvents;
  const { hooks: _old, ...rest } = settings;
  return Object.keys(hooks).length > 0 ? { ...rest, hooks } : rest;
}

/**
 * The changed lines between two texts, "+ " added and "- " removed, with two
 * lines of context around each change and "…" between separate changes.
 */
export function lineDiff(before: string, after: string, context = 2): string[] {
  const a = before === "" ? [] : before.replace(/\n$/, "").split("\n");
  const b = after === "" ? [] : after.replace(/\n$/, "").split("\n");
  // Longest common subsequence, filled from the end so the walk below goes forwards.
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  // Walk both texts, putting removals before additions as a unified diff does.
  const lines: { mark: " " | "+" | "-"; text: string }[] = [];
  let [i, j] = [0, 0];
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      lines.push({ mark: " ", text: a[i++]! });
      j++;
    } else if (j < b.length && (i >= a.length || lcs[i]![j + 1]! > lcs[i + 1]![j]!)) lines.push({ mark: "+", text: b[j++]! });
    else lines.push({ mark: "-", text: a[i++]! });
  }

  const near = (k: number) => lines.slice(Math.max(0, k - context), k + context + 1).some((l) => l.mark !== " ");
  const out: string[] = [];
  let skipped = false;
  lines.forEach((line, k) => {
    if (!near(k)) {
      skipped = true;
      return;
    }
    if (skipped && out.length > 0) out.push("  …");
    skipped = false;
    out.push(`${line.mark} ${line.text}`);
  });
  return out;
}

const formatSettings = (settings: Settings) => `${JSON.stringify(settings, null, 2)}\n`;

async function readSettings(path: string): Promise<{ text: string; settings: Settings }> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { text: "", settings: {} };
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UsageError(`${SETTINGS_PATH} isn't valid JSON, so said left it alone. Fix the file and run this again.`);
  }
  if (!isObject(parsed)) throw new UsageError(`${SETTINGS_PATH} doesn't hold a JSON object, so said left it alone.`);
  return { text: raw, settings: parsed };
}

async function change(action: "install" | "uninstall", repo: string | undefined, io: Io): Promise<number> {
  const root = await findRepoRoot(repo ?? ".");
  const path = join(root, SETTINGS_PATH);
  const { text: before, settings } = await readSettings(path);
  const updated = action === "install" ? addHook(settings) : removeHook(settings);

  if (updated === null) {
    io.out(action === "install" ? `The hook is already in ${SETTINGS_PATH}. Nothing changed.` : `There's no said hook in ${SETTINGS_PATH}. Nothing changed.`);
    return EXIT.ok;
  }

  const after = formatSettings(updated);
  await mkdir(join(root, ".claude"), { recursive: true });
  await writeFile(path, after);

  io.out(`${before === "" ? "Created" : "Updated"} ${SETTINGS_PATH}:`);
  for (const line of lineDiff(before, after)) io.out(`  ${line}`);
  io.out("");
  io.out(
    action === "install"
      ? `Each prompt will be added to ${LEDGER_DIR}/ledger.jsonl, which git ignores. It starts with your next Claude Code session.`
      : `Prompts are no longer recorded. ${LEDGER_DIR}/ledger.jsonl was left as it is.`,
  );
  return EXIT.ok;
}

/**
 * Run by the hook for each prompt. Claude Code adds a UserPromptSubmit hook's
 * stdout to the prompt and blocks the prompt on exit code 2, so this never
 * prints to stdout and never exits with 2.
 */
export async function recordPrompt(input: string, now = new Date()): Promise<boolean> {
  const event = JSON.parse(input) as { session_id?: unknown; prompt?: unknown; cwd?: unknown };
  if (typeof event.prompt !== "string" || event.prompt.trim() === "") return false;

  const root = await findRepoRoot(typeof event.cwd === "string" ? event.cwd : ".");
  const dir = join(root, LEDGER_DIR);
  await mkdir(dir, { recursive: true });
  // The ledger holds unredacted prompts, so it must never be committed.
  await writeFile(join(dir, ".gitignore"), "*\n", { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  const entry = { at: now.toISOString(), sessionId: typeof event.session_id === "string" ? event.session_id : null, text: event.prompt };
  await appendFile(join(dir, "ledger.jsonl"), `${JSON.stringify(entry)}\n`);
  return true;
}

/** `readStdin` is for tests. */
export async function hook(argv: string[], io: Io, readStdin: () => Promise<string> = () => text(process.stdin)): Promise<number> {
  const [action, ...rest] = argv;
  const { values } = parseArgs({
    args: rest,
    options: { repo: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
  if (action === undefined || action === "--help" || action === "-h" || values.help) {
    io.out(HOOK_HELP);
    return EXIT.ok;
  }

  if (action === "install" || action === "uninstall") return change(action, values.repo, io);
  if (action === "record") {
    try {
      await recordPrompt(await readStdin());
      return EXIT.ok;
    } catch (error) {
      io.err(`said hook record: ${(error as Error).message}`);
      return EXIT.usage;
    }
  }
  throw new UsageError(`Unknown hook action "${action}". Use install or uninstall.`);
}
