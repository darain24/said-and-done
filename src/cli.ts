#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

/** Exit codes from ARCHITECTURE §11. */
export const EXIT = { ok: 0, usage: 1 } as const;

const COMMANDS = ["scan", "build", "chapters", "badge", "hook"] as const;

const HELP = `said — turn a voice-built repo into a replayable Build Story

Usage: said <command> [options]

Commands:
  scan        Summarise the sessions and commits found for this repo
  build       Write build-story.html
  chapters    Print YouTube chapter markers
  badge       Print a "built by voice" README badge
  hook        Install or remove the prompt ledger hook

Options:
  -h, --help     Show this help
  -v, --version  Show the version`;

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

export function version(): string {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  return pkg.version;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [command] = argv;

  if (command === undefined || command.startsWith("-")) {
    let values;
    try {
      ({ values } = parseArgs({
        args: argv,
        options: { help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" } },
      }));
    } catch (error) {
      io.err(`${(error as Error).message}\nRun "said --help" to see the options.`);
      return EXIT.usage;
    }
    if (values.version) {
      io.out(version());
      return EXIT.ok;
    }
    io.out(HELP);
    return EXIT.ok;
  }

  if ((COMMANDS as readonly string[]).includes(command)) {
    io.err(`"said ${command}" isn't built yet.`);
    return EXIT.usage;
  }

  io.err(`Unknown command "${command}".\nRun "said --help" to see the commands.`);
  return EXIT.usage;
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    // realpath, because npm runs the bin through a symlink.
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  const code = await run(process.argv.slice(2), {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
  process.exitCode = code;
}
