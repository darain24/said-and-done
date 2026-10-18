// `said doctor` (ROADMAP §5.3): checks the setup and says how to fix what's wrong.
// The output is meant to be pasted into a bug report, so the home folder is shown as ~.
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs, promisify } from "node:util";
import type { Io } from "../cli.js";
import { type LoadedConfig, loadConfig } from "../config.js";
import { EXIT } from "../exit.js";
import { formatCount } from "../format.js";
import { findRepoRoot, readGitLog, readRemoteUrl } from "../git/log.js";
import { readTemplate } from "../render/inject.js";
import { locateSessions, NoSessionsError } from "../sessions/locate.js";
import { parseSessionFiles } from "../sessions/parse.js";
import { addHook, SETTINGS_PATH } from "./hook.js";

export const DOCTOR_HELP = `Usage: said doctor [options]

Check that said can find everything it needs for this repo: Node, git, the
repo, said.config.json, the session files and the page template. Each problem
comes with a fix. Paste the output into bug reports; your home folder shows as ~.

Options:
  --repo <path>              Repo to check (default: the current directory)
  --sessions-dir <path>      Check this session folder instead
  --config <path>            Check this config file instead of said.config.json
  -h, --help                 Show this help

Exit code 5 if any check fails.`;

export type CheckStatus = "ok" | "info" | "warn" | "fail";

export interface Check {
  status: CheckStatus;
  label: string;
  detail: string;
  fix?: string;
}

export interface DoctorOptions {
  repo?: string;
  sessionsDir?: string;
  config?: string;
  /** For tests. */
  nodeVersion?: string;
  templates?: URL[];
  projectsDir?: string;
}

const MIN_NODE = 22;
const run = promisify(execFile);

export async function runChecks(options: DoctorOptions = {}): Promise<Check[]> {
  const checks: Check[] = [];
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const major = Number(nodeVersion.split(".")[0]);
  checks.push(
    major >= MIN_NODE
      ? { status: "ok", label: "Node", detail: `v${nodeVersion}` }
      : { status: "fail", label: "Node", detail: `v${nodeVersion}`, fix: `Install Node ${MIN_NODE} or later.` },
  );

  try {
    const { stdout } = await run("git", ["--version"]);
    checks.push({ status: "ok", label: "git", detail: stdout.trim() });
  } catch {
    checks.push({ status: "fail", label: "git", detail: "not found", fix: "Install git and make sure it's on PATH." });
    return checks;
  }

  let repoRoot: string;
  try {
    repoRoot = await findRepoRoot(options.repo ?? ".");
    checks.push({ status: "ok", label: "Repo", detail: repoRoot });
  } catch {
    checks.push({ status: "fail", label: "Repo", detail: "not inside a git repo", fix: "Run said from inside the repo, or pass --repo <path>." });
    return checks;
  }

  const commits = await readGitLog(repoRoot);
  checks.push(
    commits.length > 0
      ? { status: "ok", label: "Commits", detail: formatCount(commits.length) }
      : { status: "warn", label: "Commits", detail: "none yet", fix: "Prompts show as uncommitted until you commit." },
  );

  const remote = await readRemoteUrl(repoRoot);
  checks.push(
    remote
      ? { status: "ok", label: "Remote", detail: `${remote} (commit links on)` }
      : { status: "info", label: "Remote", detail: "no usable origin remote; commit markers won't be links" },
  );

  let loaded: LoadedConfig | undefined;
  try {
    loaded = await loadConfig(repoRoot, options.config);
    checks.push({ status: loaded.path ? "ok" : "info", label: "Config", detail: loaded.path ?? "no said.config.json (optional)" });
  } catch (error) {
    checks.push({ status: "fail", label: "Config", detail: (error as Error).message, fix: "Fix the file, or delete it to use the defaults." });
  }

  const sessionsDir = options.sessionsDir ?? loaded?.config.sessionsDir;
  try {
    const located = await locateSessions({ repoRoot, sessionsDir, projectsDir: options.projectsDir });
    checks.push({ status: "ok", label: "Sessions", detail: `${formatCount(located.files.length)} session files (${located.how})` });
    const parsed = await parseSessionFiles(located.files, repoRoot);
    const malformed = parsed.diagnostics.malformed;
    checks.push(
      parsed.prompts.length > 0
        ? {
            status: malformed > 0 ? "warn" : "ok",
            label: "Prompts",
            detail: `${formatCount(parsed.prompts.length)} found${malformed > 0 ? `, ${formatCount(malformed)} malformed lines skipped` : ""}`,
            ...(malformed > 0 ? { fix: "Malformed lines are usually a session that was still being written. Run said scan for details." } : {}),
          }
        : {
            status: "warn",
            label: "Prompts",
            detail: "none in this repo's sessions",
            fix: "Check that the sessions ran inside this repo (said scan shows what was skipped).",
          },
    );
  } catch (error) {
    if (!(error instanceof NoSessionsError)) throw error;
    checks.push({
      status: "fail",
      label: "Sessions",
      detail: `none found in ${error.searched.join(", ")}`,
      fix: "Work on the repo in Claude Code at least once, or pass --sessions-dir <path>.",
    });
  }

  try {
    await readTemplate(options.templates);
    checks.push({ status: "ok", label: "Template", detail: "story template found" });
  } catch (error) {
    checks.push({ status: "fail", label: "Template", detail: (error as Error).message.split("\n")[0]!, fix: 'Rebuild the package with "npm run build".' });
  }

  checks.push(await hookCheck(repoRoot));
  return checks;
}

async function hookCheck(repoRoot: string): Promise<Check> {
  const notInstalled: Check = { status: "info", label: "Hook", detail: "not installed (optional): said hook install" };
  let text: string;
  try {
    text = await readFile(join(repoRoot, SETTINGS_PATH), "utf8");
  } catch {
    return notInstalled;
  }
  try {
    return addHook(JSON.parse(text)) === null ? { status: "ok", label: "Hook", detail: "installed; prompts go to .said/ledger.jsonl" } : notInstalled;
  } catch {
    return { status: "warn", label: "Hook", detail: `couldn't read ${SETTINGS_PATH}`, fix: "Check that the file is valid JSON." };
  }
}

const SYMBOL: Record<CheckStatus, string> = { ok: "✓", info: "·", warn: "!", fail: "✗" };

export function formatChecks(checks: Check[], home = homedir()): string[] {
  const tidy = (text: string) => (home ? text.split(home).join("~") : text);
  const out = ["said doctor", ""];
  for (const c of checks) {
    out.push(`  ${SYMBOL[c.status]} ${c.label.padEnd(10)}${tidy(c.detail)}`);
    if (c.fix) out.push(`    → ${tidy(c.fix)}`);
  }
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  out.push("");
  if (failed > 0) out.push(`${failed} ${failed === 1 ? "problem" : "problems"} to fix.`);
  else if (warned > 0) out.push(`Ready, with ${warned} ${warned === 1 ? "warning" : "warnings"}.`);
  else out.push("All good. Run said build.");
  return out;
}

export async function doctor(argv: string[], io: Io, options: Pick<DoctorOptions, "templates" | "projectsDir"> = {}): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      repo: { type: "string" },
      "sessions-dir": { type: "string" },
      config: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    io.out(DOCTOR_HELP);
    return EXIT.ok;
  }

  const checks = await runChecks({ ...options, repo: values.repo, sessionsDir: values["sessions-dir"], config: values.config });
  for (const line of formatChecks(checks)) io.out(line);
  return checks.some((c) => c.status === "fail") ? EXIT.checks : EXIT.ok;
}
