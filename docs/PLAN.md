# Said & Done — Plan

Wispr Flow shortlisting task (Hacker House Goa). Build anything, **entirely by voice** with Wispr Flow.

- Account must be created via the referral link: https://ref.wisprflow.ai/hhg
- Submit: public GitHub repo + demo video showing the voice-driven build process
- Form: https://forms.gle/Lv9wF8gYVHdEqfJW8 — **no resubmissions**
- Deadline: **October 6, 2026, 11:59 PM**

> All project code is written by dictating prompts to an AI coding agent via Wispr Flow, on camera. The docs in `docs/` (this plan, PRD, DESIGN, ARCHITECTURE, RECORDING), `CLAUDE.md` and the placeholder README were written before recording started; they are the only files not produced that way.

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
2. Dictionary: `Said and Done`, `JSONL`, `UserPromptSubmit`, `Claude Code`, `TypeScript`, `npx`, `Vite`, `KeyCastr`, `SVG`, `gitBranch`, `redaction`, `Tailwind`, `React`, `vite-plugin-singlefile`, `useState`, `className`.
3. Snippets:
   - "run the checks" → *Run the tests and the type checker, fix anything that fails, and summarize what changed in two lines.*
   - "commit this" → *Commit the current work with a clear, descriptive message. Don't push.*
   - "show me" → *Start the app or regenerate the build story and tell me exactly what to open.*
4. Command Mode (Pro; check the trial) — use it on camera at least once to fix a prompt by voice.
5. Editor: Claude Code in the Claude desktop app (a fresh Code tab session per recording).
6. Practise 20 minutes. Speak prompts as *Goal… Context… Constraints… Done when…*

## How to build by voice

Claude Code writes all the code. You direct it by speaking prompts through Wispr Flow, which puts your words into Claude Code's prompt box. You press Enter, Claude Code edits, runs and commits, and you check the result and speak the next prompt.

| Who | Job |
|---|---|
| You (voice) | Product owner and reviewer: decide, describe, check, ask for fixes |
| Wispr Flow | Turns speech into clean text in Claude Code's prompt box |
| Claude Code | The engineer: writes code, runs tests, fixes bugs, commits |

**Setup (once, off camera is fine)**
1. Install Wispr Flow (account via the referral link) and grant Microphone and Accessibility access.
2. Check the hotkey in Wispr settings (usually hold Fn to talk, release to insert). Add the dictionary words and snippets above.
3. Use one Claude Code surface for the whole build: a new Claude desktop Code tab session on this folder, zoomed in, sidebar collapsed.
4. Start a fresh session for every recording. Never continue the typed planning chat.
5. Test the loop once: hold Fn, say "What files are in this repo?", release, Enter.

**Session 1 opening prompts** (talking points, say them in your own words)
1. "Read CLAUDE.md and the docs folder and tell me in three lines what we're building and how." (A good on-camera opener.)
2. "Set up project permissions so npm, npx, node and git commands run without asking."
3. "Set up the repo: a TypeScript CLI in src with node:test, and a Vite React TypeScript app in web with Tailwind v4 and vite-plugin-singlefile. Add root scripts for build, test and dev, and fill in the Commands section of CLAUDE.md. Done when tests and the build both pass on an empty project."
4. "run the checks", then "commit this".

**The loop for every feature (5–15 min)**
1. Speak the prompt: goal, context, constraints, done when. One feature per prompt.
2. For big pieces, say "Plan this first, don't write code yet", then approve or adjust by voice.
3. Watch it work and approve permission prompts.
4. "show me", open the page, and ask for changes by voice ("the cards feel cramped, add spacing").
5. "run the checks", then "commit this": about one commit per feature.

**Rules on camera**
- Allowed keys: Wispr hotkey, Enter, Esc, permission approvals, clicking into the prompt box. KeyCastr shows them all.
- Never type a fix. If Wispr mishears, use Command Mode or say it again, then add the word to the dictionary.
- Ask in plain words instead of slash commands ("create a CLAUDE.md", not "/init"). A dictated slash can come out as the word "slash".
- Name things instead of spelling paths ("the Timeline component").
- Record every session (OBS or QuickTime + KeyCastr) and note good moments' timestamps.

## Build phases

Requirements: [PRD.md](PRD.md) · UI: [DESIGN.md](DESIGN.md) · Full technical design: [ARCHITECTURE.md](ARCHITECTURE.md).

**Stack and architecture.** The output must stay one self-contained HTML file that opens offline from `file://` and can be hosted on GitHub Pages.

- **Layout:** `src/` holds the Node 22 + TypeScript CLI (`scan`, `build`, `chapters`, `badge`, `hook install`), tested with `node:test`. `web/` holds the Vite + React + TypeScript app, styled with Tailwind v4 via `@tailwindcss/vite`.
- **Single-file output:** `vite-plugin-singlefile` bundles `web/` into one `story-template.html` with all JS and CSS inlined, built once at package build time.
- **Data injection:** the template contains `<script id="story-data" type="application/json">`. `said build` writes the story JSON into it, escaping `<` as `\u003c` so it can't break out of the tag. React reads it on load. One template serves every repo.
- **Dev loop:** `npm run dev` in `web/` loads a fixture `story.sample.json`, so the UI can be built with hot reload and no CLI.
- **Tailwind rules for the agent:**
  - Write class names in full, never `bg-${color}`, so Tailwind's scanner finds them.
  - Use a lookup map for variant styles.
  - Use `dark:` variants with a class-based toggle via `@custom-variant dark`.
  - Keep shared colours as `@theme` tokens in `web/src/index.css`.

| Day | Phase | Done when |
|---|---|---|
| Oct 1–2 | Planning docs, Wispr setup, recording setup (OBS + KeyCastr), GitHub repo | Test recording looks right |
| Oct 3 | Intro; scaffold; core: locate and parse sessions (PRD FR-1–7), redaction (FR-20–22), git and correlation (FR-10–11), `said scan` with `--since`/`--exclude-session` (FR-30) | `said scan` prints a correct summary of its own repo; tests pass |
| Oct 4 | Build Story page per DESIGN.md (FR-40–49), `said build` (FR-31), replay (FR-47), chapters (FR-32), badge (FR-33) | `said build` → one `build-story.html` that opens offline from `file://`; replay is smooth; chapters paste straight into YouTube |
| Oct 5 | README, publish own story to GitHub Pages, one real bug fixed by voice on camera, payoff and outro; `said hook install` (FR-34) only if time allows | Fresh clone works from the README alone |
| Oct 6 | Edit video, final checks, submit by afternoon | Form submitted with hours to spare |

**Risks:**
- Session format changes / odd entries → defensive parser, real fixtures, "unrecognised entry" count instead of crashing.
- Sub-agent and tool-result messages counted as prompts → filter on role and source, with tests.
- Multiple sessions/repos → match on `cwd`, sort by timestamp, dedupe by `promptId`.
- Privacy → redaction on by default; `said build` previews what will be published.
- Tailwind classes missing from the build output → no dynamic class strings; check the built CSS contains the timeline and replay classes.

## Demo video (4–6 min + unlisted raw footage)

Full recording setup and scene-by-scene screenplay: [RECORDING.md](RECORDING.md).

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
