# Said & Done

[![built by voice: 19 prompts](docs/said-badge.svg)](#built-by-voice)

**Turn a voice-built repo into a replayable Build Story.**

Said & Done reads a repo's Claude Code session history and its git log, and writes one self-contained HTML page: every prompt, the files it touched, the commit it led to, the totals, and a timelapse replay of the whole build. It also prints YouTube chapter markers and writes a "built by voice" README badge.

## The problem

More and more software is built by talking to an AI coding agent, often by voice. But when someone says "I built this by voice", there's nothing to show for it apart from a video.

- The prompts that shaped the project sit in local session files nobody else can see.
- The git history shows *what* changed, but not what was *asked for*.
- Contest entrants, people writing about their workflow and teams reviewing AI-assisted work have no simple way to turn that history into something others can read and check.

Said & Done makes the prompt history **visible and checkable**. It can't prove a prompt was spoken rather than typed (nothing in a transcript can), and the page says so. The screen recording is the proof of voice; the Build Story is the record of what was said and what got done.

## Quick start

Needs Node 22+, git, and a repo you've worked on with Claude Code. macOS and Linux are supported.

```bash
git clone https://github.com/darain24/said-and-done.git
cd said-and-done
npm install
npm run build
```

Then, from inside the repo you want a story for:

```bash
node /path/to/said-and-done/dist/cli.js scan     # check the numbers look right
node /path/to/said-and-done/dist/cli.js build    # writes build-story.html
```

Open `build-story.html` in any browser. It works offline from `file://`, so you can also host it as-is on GitHub Pages. (Run `npm link` once in the said-and-done folder if you'd rather just type `said`.)

| Command | What it does |
|---|---|
| `said scan` | Prints sessions, prompts, words, commits, files touched, time span and active time. `--json` prints the story data instead. |
| `said build` | Writes `build-story.html` and prints a redaction preview. `--out`, `--title`, `--no-redact`. |
| `said chapters --start <time>` | Prints YouTube chapter lines (`0:00 Title`), one per commit made during the recording. `--end` is optional. |
| `said badge` | Writes `said-badge.svg`: "built by voice │ N prompts". |
| `said hook install` | Adds a `UserPromptSubmit` hook that logs each prompt to `.said/ledger.jsonl` (git-ignored). `uninstall` removes it. |

`scan`, `build` and `badge` share these options:

```
--repo <path>              Repo to read (default: the current directory)
--sessions-dir <path>      Read session files from this folder instead
--since <ISO date>         Leave out prompts before this time
--until <ISO date>         Leave out prompts after this time
--exclude-session <id>     Leave out a session; repeatable, an id prefix is enough
```

Use `--since` or `--exclude-session` to drop planning sessions you typed before you started recording. Every command has `--help`.

## How it reads sessions

Claude Code keeps each session as a JSONL file under `~/.claude/projects/`. Said & Done:

1. **Finds the sessions.** It starts from the repo's git root and looks for the matching project folder (Claude Code's folder name replaces every non-alphanumeric character in the path with `-`). That name is lossy, so it's only a first guess: if the folder is missing, it searches every project folder for entries whose working directory is inside the repo. `--sessions-dir` skips both.
2. **Keeps only this repo.** Every entry is checked, not just the file, because sessions can move between projects and run from subfolders. Entries whose `cwd` is outside the repo are dropped.
3. **Keeps only human prompts.** Tool results, sub-agent traffic, meta entries, slash-command wrappers, local command output, `!` shell input, system reminders and "request interrupted" markers are all left out.
4. **Collects file touches** from the agent's `Edit`, `Write`, `MultiEdit` and `NotebookEdit` calls, and links each one to the prompt that caused it.
5. **Parses defensively.** Malformed lines and unknown entry types are counted and shown by `scan`, never thrown. A format change lowers accuracy but doesn't crash.
6. **Dedupes and sorts** prompts, so reading the same session twice gives the same story.
7. **Links prompts to commits.** Walking the git log in order, each commit takes the prompts that came after the previous commit. The link is marked `files` when those prompts edited files the commit changed, and `time` when only the timing matches. Prompts after the last commit show as uncommitted, and commits with no prompts still appear.

This matches how a voice build actually goes: you say a few prompts, then "commit this".

## Privacy and redaction

The output is meant to be published, so it's safe by default:

- **Redaction is on by default** and runs straight after parsing, so nothing unredacted reaches the story or the page. It covers prompt text, file paths and commit subjects:

  | Kind | What it catches | Becomes |
  |---|---|---|
  | `key` | Provider keys (`sk-`, `ghp_`, `github_pat_`, `xox…-`, `AKIA`, `AIza`), JWTs, and `NAME_KEY=value` style assignments | `[redacted:key]` |
  | `secret` | Long high-entropy strings (git shas and UUIDs are left alone) | `[redacted:secret]` |
  | `email` | Email addresses | `[redacted:email]` |
  | `home` | `/Users/<name>`, `/home/<name>`, `C:\Users\<name>` | `~` |
  | `ip` | Private IPv4 addresses | `[redacted:ip]` |

- **You see what was redacted.** `said build` prints counts by type and the first few redacted snippets before the output path. Placeholders are visibly styled on the page.
- **`--no-redact` is loud.** It prints a warning, and the page shows an "unredacted" banner.
- **Nothing leaves your machine.** The CLI has zero runtime npm dependencies and never touches the network. The page is one HTML file with a Content-Security-Policy that blocks outside requests: no CDNs, web fonts or remote images.
- **Author emails are never read** from git.
- **The hook's ledger stays local.** `.said/ledger.jsonl` holds raw prompts, so the hook writes a `.gitignore` inside `.said/` and the ledger is never committed.

Redaction is pattern-based, so give the page a quick read before you publish it.

## Built by voice

[![built by voice: 19 prompts](docs/said-badge.svg)](#built-by-voice)

Said & Done was built for the Wispr Flow × Hacker House Goa shortlisting task. All of its code was written by Claude Code from prompts I spoke through [Wispr Flow](https://wisprflow.ai), recorded on camera. No code or prompts were typed.

**Written before recording started:** [`CLAUDE.md`](CLAUDE.md) and the [`docs/`](docs) folder (PRD, architecture, design, plan and recording runbook). They were planned in a typed chat beforehand and are the only files not produced by voice. Everything else, including the CLI, the web page, the tests and this README, came from spoken prompts.

The badge above was made by Said & Done from this repo's own sessions, with the typed planning sessions left out:

```bash
said badge --exclude-session 061228f9 --exclude-session b877ca9b --out docs/said-badge.svg
```

To add one to your own project, run `said badge` and paste the line it prints into your README.

| Doc | What's in it |
|---|---|
| [PRD](docs/PRD.md) | Problem, users, requirements (FR/NFR IDs), metrics, scope |
| [Architecture](docs/ARCHITECTURE.md) | Repo layout, session parsing, prompt-to-commit linking, story model, testing |
| [Design](docs/DESIGN.md) | Design tokens, layout, components and replay behaviour for the Build Story page |
| [Plan](docs/PLAN.md) | Schedule, voice-build workflow, demo video, submission checklist |
| [Recording](docs/RECORDING.md) | Screen-recording setup and scene-by-scene screenplay |

## Development

```bash
npm test            # node:test over test/**/*.test.ts
npm run typecheck   # src/, test/, scripts/ and web/
npm run dev         # Vite dev server for the Build Story page
```
