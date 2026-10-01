# Said & Done — Plan

Wispr Flow shortlisting task (Hacker House Goa). Build anything, **entirely by voice** with Wispr Flow.

- Account must be created via the referral link: https://ref.wisprflow.ai/hhg
- Submit: public GitHub repo + demo video showing the voice-driven build process
- Form: https://forms.gle/Lv9wF8gYVHdEqfJW8 — **no resubmissions**
- Deadline: **October 6, 2026, 11:59 PM**

> All project code is written by dictating prompts to an AI coding agent via Wispr Flow, on camera. This plan is the only file not produced that way.

## The idea

Every entrant has to prove they built by voice. Said & Done is the tool that makes voice-driven development provable and shareable — built by voice, and it replays its own construction.

A small CLI plus a single-file web page. It reads a repo's AI-agent session history and its git log, and produces a shareable **Build Story**:

| Feature | What it shows |
|---|---|
| Timeline | Each spoken prompt → files the agent touched → resulting commit and diff stats |
| Replay | A timelapse of the project growing, prompt by prompt |
| Voice stats | Prompts, words dictated, idea-to-first-commit time, longest prompt, estimated typing time saved (labelled as an estimate) |
| Video chapters | Given the recording's start time, outputs YouTube chapter markers |
| Badge | "Built by voice" SVG for the README with the prompt count |
| Redaction | Strips keys, tokens, emails and home paths before publishing |

**Data source.** Claude Code saves every session as JSONL under `~/.claude/projects/<encoded-repo-path>/`. User entries carry `timestamp`, `cwd`, `gitBranch`, `sessionId`, `promptId`; agent Edit/Write tool calls carry file paths. History can be rebuilt after the fact from prompt #1. An optional `UserPromptSubmit` hook adds live capture. The format is internal and may change, so the parser must be defensive and tested against saved fixtures.

**Alternatives considered:** (B) a Goa-themed Phaser browser game; (C) a hands-free accessibility tool for people with RSI.

## Proof of voice

1. KeyCastr keystroke overlay on screen for the whole recording — only the Wispr hotkey, Enter and permission approvals.
2. Wispr's on-screen indicator visible, mic audio recorded, face cam optional.
3. Generated `build-story.html` and prompt count in the README.
4. Full uncut recording as an unlisted link alongside the edited 4–6 minute video.
5. Commit messages dictated (snippet below).

Ground rules, stated on camera: no typing code or prompts. `gh` logged in beforehand so no secrets are typed on camera.

## Wispr Flow setup (Day 0)

1. Sign up only through https://ref.wisprflow.ai/hhg and screenshot the confirmation.
2. Dictionary: `Said and Done`, `JSONL`, `UserPromptSubmit`, `Claude Code`, `TypeScript`, `npx`, `Vite`, `KeyCastr`, `SVG`, `gitBranch`, `redaction`.
3. Snippets:
   - "run the checks" → *Run the tests and the type checker, fix anything that fails, and summarize what changed in two lines.*
   - "commit this" → *Commit the current work with a clear, descriptive message. Don't push.*
   - "show me" → *Start the app or regenerate the build story and tell me exactly what to open.*
4. Command Mode (Pro; check the trial) — use it on camera at least once to fix a prompt by voice.
5. Editor: Claude Code in the terminal. If using Cursor, check Wispr's IDE features (file tagging, variable recognition) and show one.
6. Practise 20 minutes. Speak prompts as *Goal… Context… Constraints… Done when…*

## Build phases

Stack: Node 22 + TypeScript, minimal dependencies, `node:test`. Output page is one self-contained HTML file (vanilla JS, inline CSS), hostable on GitHub Pages.

| Day | Phase | Done when |
|---|---|---|
| Oct 1 | Wispr setup, recording setup (OBS/QuickTime + KeyCastr), empty GitHub repo | Test recording looks right |
| Oct 2 | Core: locate session files for a repo; defensive parse (skip unknown types, sidechains, non-human messages); link prompts → Edit/Write paths → commits by time and files; data model; fixtures; redaction | `said scan` prints a correct summary of its own repo; tests pass |
| Oct 3 | Build Story page: timeline, prompt cards, files and diff stats, stats panel, light/dark, mobile | `said build` → `build-story.html` opens and looks good |
| Oct 4 | Replay timelapse, chapter export, README badge, optional `said hook install` | Replay is smooth; chapters paste straight into YouTube |
| Oct 5 | README (problem, demo GIF, quick start), publish own story to GitHub Pages, one real bug fixed by voice on camera | Fresh clone works from the README alone |
| Oct 6 | Edit video, final checks, submit by afternoon | Form submitted with hours to spare |

**Risks:**
- Session format changes / odd entries → defensive parser, real fixtures, "unrecognised entry" count instead of crashing.
- Sub-agent and tool-result messages counted as prompts → filter on role and source, with tests.
- Multiple sessions/repos → match on `cwd`, sort by timestamp, dedupe by `promptId`.
- Privacy → redaction on by default; `said build` previews what will be published.

## Demo video (4–6 min + unlisted raw footage)

1. **0:00 Hook** — "This task asks you to prove you built by voice. So I built the tool that proves it, by voice, and it recorded its own construction." Flash the replay.
2. **0:20 Setup** — referral account, dictionary, snippets, keystroke overlay, ground rules.
3. **0:50 Build montage (~3 min)** — 4–5 real moments: long prompt spoken in seconds, a Command Mode edit, a bug fixed by voice, "commit this".
4. **3:50 Payoff** — `said build` on its own repo, replay, chapter export (used on this video), README badge.
5. **4:40 Close** — stats, repo link.

## Submission checklist

- [ ] Account created via referral link
- [ ] Repo public; README works on a fresh clone
- [ ] Video link opens when logged out
- [ ] Raw recording linked
- [ ] No secrets in repo or story
- [ ] Form filled in once
