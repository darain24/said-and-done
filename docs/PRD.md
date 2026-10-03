# Said & Done — Product Requirements

| | |
|---|---|
| **Status** | Approved for build, Oct 3, 2026 |
| **Owner** | darain24 |
| **Deadline** | Oct 6, 2026, 11:59 PM (Wispr Flow shortlisting task) |
| **Related** | [PLAN.md](PLAN.md) · [DESIGN.md](DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [RECORDING.md](RECORDING.md) |

Requirement IDs (`FR-`, `NFR-`) are stable. Refer to them in prompts, commits and tests.

---

## 1. Problem

More and more software is built by talking to an AI coding agent, often by voice. When someone says "I built this by voice", there's nothing to show for it apart from a video. The prompts that shaped the project sit in local session files nobody else can see. The git history shows *what* changed, but not what was *asked for*.

People who need to show how something was built (contest entrants, people writing about their workflow, teams reviewing AI-assisted work) have no simple way to turn that history into something others can read.

## 2. Product summary

Said & Done is a command-line tool that reads a repo's Claude Code session history and its git log, and produces a **Build Story**: one self-contained HTML page showing every prompt, the files it touched, the commit it led to, and the totals. The page can replay the build as a timelapse, and the CLI can also output YouTube chapter markers and a "built by voice" README badge.

It doesn't prove that prompts were spoken rather than typed. It makes the prompt history **visible and checkable**, and the screen recording is the proof of voice. The page says this plainly.

## 3. Goals and non-goals

**Goals**
1. Turn a repo's Claude Code sessions plus its git log into an accurate, readable Build Story with one command.
2. Make the output safe to publish: redaction on by default, nothing loaded from the network.
3. Produce extras for a demo video: replay, chapters and badge.
4. Run on Said & Done's own repo as the payoff of the demo.

**Non-goals (v1)**
- Proving that a prompt was spoken. That's impossible from a transcript.
- Coding agents other than Claude Code. The design leaves room for them; see [ARCHITECTURE.md](ARCHITECTURE.md).
- Hosting, accounts or a server. The output is a static file.
- Editing or annotating stories in the browser.
- Windows support. Best effort only; macOS and Linux are the targets.

## 4. Users

| User | Wants | Success looks like |
|---|---|---|
| **Voice builder** (primary; the entrant) | Shareable, credible evidence of how a project was built | Runs one command and gets a page worth linking from the README |
| **Viewer / judge** | To understand quickly how the project came together | Sees in under 30 s what was asked for, what changed, and the totals; can check any card against a commit |
| **Future maintainer** | To know *why* a change exists | Finds the prompt behind a commit |

## 5. Core user flow

1. The builder works in Claude Code (by voice, through Wispr Flow) and commits as they go.
2. `said scan` prints a summary to check that the data looks right.
3. `said build` writes `build-story.html` and prints a redaction preview.
4. The builder opens the file (offline), checks it, and publishes it (for example on GitHub Pages).
5. `said chapters --start <time>` gives chapter markers for the demo video, and `said badge` gives the README badge.

## 6. Functional requirements

Priority: **P0** = needed for the submission · **P1** = expected, cut only under time pressure · **P2** = stretch.

### 6.1 Reading sessions

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-1 | P0 | **Find sessions** for a repo: default the current directory's git root; `--repo <path>` overrides. | Finds `~/.claude/projects/<encoded-path>/`, where the encoding replaces every non-alphanumeric character in the absolute path with `-` (so `hhgoa_task4` becomes `hhgoa-task4`). If that folder is missing, searches other project folders for entries whose `cwd` is inside the repo. `--sessions-dir <path>` overrides both. A clear error message if nothing is found. |
| FR-2 | P0 | **Extract human prompts** from session JSONL. | Keeps only real prompts typed or dictated by the user (rules in ARCHITECTURE §4). Excludes tool results, sidechains (sub-agents), `isMeta` entries, slash-command wrappers, local command output, `!` shell input, system reminders and "request interrupted" markers. |
| FR-3 | P0 | **Scope to this repo.** | Keeps an entry only if its `cwd` is the repo root or inside it. Sessions that moved between projects keep only their in-repo entries. |
| FR-4 | P0 | **Collect file touches** from the agent's Edit, Write, MultiEdit and NotebookEdit tool calls, linked to the prompt that caused them. | Paths are made relative to the repo root. Paths outside the repo are dropped. |
| FR-5 | P0 | **Parse defensively.** | Malformed lines and unknown entry types are counted, never thrown. `scan` reports the counts. A changed format reduces accuracy but doesn't crash. |
| FR-6 | P0 | **Filters:** `--since <ISO>`, `--until <ISO>`, `--exclude-session <id>` (repeatable). | Filtered prompts don't appear in any output or totals. Used to drop the typed planning sessions. |
| FR-7 | P0 | **Dedupe** prompts by `promptId` (falling back to `uuid`), and sort by timestamp. | The same session read twice gives the same story. |

### 6.2 Git and correlation

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-10 | P0 | **Read the git log**: sha, subject, ISO time, files changed, and lines added/removed per file. | Uses `git` on PATH. Author emails are never stored. Works on a repo with 0 commits (empty commit list, no error). |
| FR-11 | P0 | **Link prompts to commits** (algorithm in ARCHITECTURE §5). | Each prompt belongs to at most one commit. A commit has a link confidence of `files` (shares files with its prompts' edits) or `time` (only the time window matches). Prompts after the last commit are `uncommitted`. Commits with no prompts still appear. |

### 6.3 Privacy

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-20 | P0 | **Redact by default** in prompt text, file paths and commit subjects: API keys and tokens (common providers plus long high-entropy strings), emails, home-directory paths, and private IPs. | Each match is replaced with a typed placeholder such as `[redacted:email]`. Unit tests cover each pattern, including false positives that must stay unredacted (git shas, UUIDs in prose). |
| FR-21 | P0 | **Redaction preview** after `build`: counts by type and the first few redacted snippets. | Printed before the output path. |
| FR-22 | P1 | `--no-redact` turns redaction off. | Prints a warning, and the page shows a visible "unredacted" banner. |

### 6.4 Commands

| ID | Pri | Command | Acceptance criteria |
|---|---|---|---|
| FR-30 | P0 | `said scan` | Prints: sessions, prompts, words, commits, files touched, time span, first prompt to first commit, unrecognised and malformed counts, and excluded-by-filter counts. `--json` prints the story JSON instead. |
| FR-31 | P0 | `said build` | Writes `build-story.html` (`--out <path>`, `--title <text>`). Opens offline from `file://`. Prints the redaction preview and the output path. |
| FR-32 | P1 | `said chapters --start <ISO> [--end <ISO>]` | Prints YouTube chapter lines (`0:00 Title`), one per commit made between start and end, titled from the commit subject (trimmed to 60 chars). Follows YouTube's rules: the first chapter at `0:00`, at least 3 chapters, each at least 10 s long (shorter ones are merged into the next). Exits with an explanation if there are fewer than 3. |
| FR-33 | P1 | `said badge` | Writes an SVG badge reading "built by voice │ N prompts" (`--out`, default `said-badge.svg`). Valid SVG with no external references. |
| FR-34 | P2 | `said hook install` / `uninstall` | Adds or removes a `UserPromptSubmit` hook in `.claude/settings.json` that appends prompts to `.said/ledger.jsonl` for live capture. Running it twice changes nothing. Prints exactly what changed. |
| FR-35 | P0 | `said --help` and `said <cmd> --help` | Usage, options and an example for every command. Exit codes: 0 ok, 1 usage error, 2 no sessions found, 3 git error. |

### 6.5 Build Story page

Visual spec: [DESIGN.md](DESIGN.md).

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-40 | P0 | **Header:** project title, repo name, date range, theme toggle, Replay button. | Visible without scrolling at 1280×800 and 390×844. |
| FR-41 | P0 | **Stats:** prompts, words spoken, commits, active time; plus first prompt to first commit, longest prompt, and estimated typing time saved. | Every number matches `said scan`. The estimate is clearly labelled with its assumptions (§8). |
| FR-42 | P0 | **Timeline** grouped by session, in time order. | A session header shows its date, time range and prompt count. |
| FR-43 | P0 | **Prompt card:** number, time, word count, prompt text, file chips. | Prompts over 6 lines are collapsed behind a "Show full prompt" toggle. More than 6 files collapse to "+N more". Redaction placeholders are visibly styled. |
| FR-44 | P0 | **Commit marker** after the prompts that led to it: short sha, subject, files changed, +/− lines, and link confidence. | Links to the commit on GitHub when a GitHub remote is known; plain text otherwise. |
| FR-45 | P0 | **Light/dark theme:** follows the OS by default, and a toggle remembers the choice. | No flash of the wrong theme on load. Still works if storage is blocked. |
| FR-46 | P0 | **Responsive:** usable from 360 px wide. | No horizontal page scroll. |
| FR-47 | P1 | **Replay:** step through the prompts as a timelapse with play/pause, 1×/2×/4× speed, a progress bar, and keyboard control. | Behaviour as in DESIGN §6. Respects reduced motion. |
| FR-48 | P0 | **Empty state** when there are no prompts. | Explains likely causes (filters, wrong repo) instead of showing a blank page. |
| FR-49 | P0 | **Footer:** method notes, generation time, Said & Done version, and the "doesn't prove speech" note. | Always present. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | **Self-contained output** | One HTML file. No network requests of any kind: no CDN, web fonts or remote images. A Content-Security-Policy meta tag blocks outside connections. |
| NFR-2 | **Size** | Template under 400 KB. A story with 500 prompts under 2 MB. |
| NFR-3 | **Speed** | `scan` and `build` finish in under 3 s for 50 MB of session files on an M-series Mac. The page first renders in under 1 s for 500 prompts. |
| NFR-4 | **Accessibility** | WCAG 2.1 AA contrast, full keyboard use, visible focus, screen-reader labels, and `prefers-reduced-motion` respected. |
| NFR-5 | **Deterministic** | The same inputs and flags give byte-identical HTML, apart from the generation timestamp. |
| NFR-6 | **Few dependencies** | The CLI has zero runtime npm dependencies (Node 22 built-ins only). The web app's runtime dependencies are React and React DOM only. |
| NFR-7 | **Privacy** | Nothing leaves the machine. Raw session files are never copied into the repo; test fixtures are redacted, trimmed extracts. |
| NFR-8 | **Readable on video** | Body text at least 16 px. Key numbers readable in a 1080p screen recording. |

## 8. Metric definitions

| Metric | Definition |
|---|---|
| Prompts | Human prompts after filters and dedupe (FR-2 to FR-7) |
| Words spoken | Sum over prompts of whitespace-separated tokens, after removing redaction placeholders |
| Sessions | Distinct `sessionId`s with at least one included prompt |
| Active time | Sum of gaps between consecutive prompts, counting only gaps of 20 minutes or less |
| First prompt to first commit | Time from the earliest prompt to the first commit linked to any prompt |
| Longest prompt | The prompt with the most words |
| Estimated typing time saved | `words / 40 wpm − words / 150 wpm`, shown as "≈ X min, estimate". The assumptions (typing at 40 wpm, speaking at 150 wpm) are shown next to it. |

## 9. Release scope

- **Submission (Oct 5, P0 + P1):** FR-1 to FR-33, FR-35, FR-40 to FR-49, and all NFRs.
- **Stretch (P2):** FR-34 (live hook).
- **After the contest:** other agents' formats, search and filters on the page, and story diffs between two builds.

## 10. Success criteria

1. On this repo, `said scan` agrees with a hand count of the recorded voice prompts, with the typed planning sessions excluded.
2. A fresh clone, then `npm ci && npm run build`, then `said build` gives a working page in under 2 minutes.
3. The Build Story of this repo is published on GitHub Pages and linked from the README.
4. Every demo-video beat in [RECORDING.md](RECORDING.md) is captured.

## 11. Risks

| Risk | Mitigation |
|---|---|
| The session format changes or has undocumented entry types | Defensive parser (FR-5), fixtures from real sessions, unknown-type counts shown in `scan` |
| Non-human entries counted as prompts | Explicit exclusion rules with a test for each (FR-2) |
| Secrets leak into a public page | Redaction on by default, preview, tests, and a manual check before publishing |
| A wrong prompt-to-commit link misleads viewers | Link confidence shown on every commit marker; method explained in the footer |
| Time pressure | Strict P0/P1/P2 order; FR-34 is the first thing cut, then FR-47 polish |
