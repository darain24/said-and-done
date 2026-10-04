#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { SCAN_HELP, scan, UsageError } from "./commands/scan.js";
import { EXIT } from "./exit.js";
import { GitError } from "./git/log.js";
import { NoSessionsError } from "./sessions/locate.js";
import { version } from "./version.js";

export { EXIT } from "./exit.js";

const COMMANDS = {
  scan: { run: scan, help: SCAN_HELP },
} as const;
const PLANNED = ["build", "chapters", "badge", "hook"];

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
  -v, --version  Show the version

Run "said <command> --help" for a command's options.`;

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;

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

  if (command in COMMANDS) {
    const { run: runCommand, help } = COMMANDS[command as keyof typeof COMMANDS];
    try {
      return await runCommand(rest, io);
    } catch (error) {
      // parseArgs throws TypeErrors with an ERR_PARSE_ARGS_* code for bad flags.
      const code = (error as { code?: string }).code ?? "";
      if (error instanceof UsageError || code.startsWith("ERR_PARSE_ARGS")) {
        io.err(`${(error as Error).message}\n\n${help}`);
        return EXIT.usage;
      }
      if (error instanceof NoSessionsError) {
        io.err(error.message);
        return EXIT.noSessions;
      }
      if (error instanceof GitError) {
        io.err(error.message);
        return EXIT.git;
      }
      throw error;
    }
  }

  if (PLANNED.includes(command)) {
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
  try {
    process.exitCode = await run(process.argv.slice(2), {
      out: (line) => process.stdout.write(`${line}\n`),
      err: (line) => process.stderr.write(`${line}\n`),
    });
  } catch (error) {
    // Stack traces only with SAID_DEBUG=1 (ARCHITECTURE §11).
    process.stderr.write(`${process.env.SAID_DEBUG === "1" ? (error as Error).stack : (error as Error).message}\n`);
    process.exitCode = 1;
  }
}
