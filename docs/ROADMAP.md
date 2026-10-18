# Said & Done — Roadmap v1.0 (contest entry → real product)

| | |
|---|---|
| **Status** | Adopted Oct 18, 2026. Phase 0 done; Phase 1 done apart from the first npm publish and a green Windows CI run |
| **Owner** | darain24 |
| **Starting point** | v0.1.0: the Wispr Flow contest build (19 commits, CLI + single-file Build Story page) |
| **Goal** | A published, maintained open-source tool people actually install, with a UI worth screenshotting |

---

## 1. Where we are

What already works, and is worth keeping:

- A zero-dependency Node CLI: `scan`, `build`, `chapters`, `badge`, `hook`.
- A careful session parser (repo scoping, human-prompt filters, defensive parsing, dedupe).
- Redaction on by default, with tests.
- Prompt → commit linking with a confidence label.
- A single-file, offline Build Story page with replay, light/dark and a design system.

What makes it still look like a contest entry:

- The pitch is "prove you built it by voice": a narrow, one-time use case.
- Claude Code only. No other agents.
- Not on npm: you have to clone and build it.
- No CI, no LICENSE, no release process, no Windows support.
- Docs talk about deadlines, recording runbooks and the shortlisting task.
- The page is one long timeline: nice to read once, nothing to explore.

## 2. New positioning

> **Said & Done: see the prompt behind every line of code.**
> Provenance for AI-written software. It links your AI coding sessions to your git history, so anyone can see what was asked, what changed, and why.

Voice stays as the origin story and a highlighted feature (the "built by voice" badge), but the product is wider: **prompt provenance for any repo built with an AI agent.**

Why this matters now: a growing share of code is written by agents, and teams, reviewers and open-source maintainers keep asking "what was the prompt?". Git records *what* changed. Nothing records *what was asked for*. That gap is the product.

### Who it's for

| User | Job to be done |
|---|---|
| Solo builder / indie hacker | Show how a project was built; share a beautiful story page |
| Open-source maintainer | See the prompts behind an AI-assisted PR before merging |
| Team lead / reviewer | Audit AI-assisted changes; find the prompt behind a bug |
| Writer / educator | Turn a build into a readable case study |

## 3. What makes it unique

Nothing else in the ecosystem does these. Each is a strong resume line on its own.

| # | Feature | What it does | Why it's unique |
|---|---|---|---|
| U1 | **`said blame <file>[:line]`** | Like `git blame`, but shows the *prompt* that produced each line, with a link into the story | "git blame for prompts" is a one-sentence pitch people get instantly |
| U2 | **Agent adapters** | One `SessionAdapter` interface; adapters for Claude Code, OpenAI Codex CLI, Gemini CLI, Aider, Cursor (where logs are readable) | Turns a Claude-only tool into the neutral layer across agents |
| U3 | **Provenance in git notes** | `said notes write` stores each commit's prompts in `refs/notes/said`; `said notes push` shares them | Provenance travels *with the repo*, so others can see it without your session files |
| U4 | **GitHub Action** | On every PR: comments a "prompts behind this PR" summary and deploys the Build Story to Pages | Puts the product where reviewers already are; free distribution |
| U5 | **Build insights** | Rework hotspots (files edited by many prompts), prompts per commit, session rhythm, "prompt → commit" lead time, a prompt-quality hint (very short vs very specific prompts against how much rework followed) | Turns a log into lessons about *how you work with AI* |
| U6 | **Story diff** | Compare two stories (two people, or two weeks) side by side | Good for teams and for blog posts |
| U7 | **Share card** | `said card` renders a 1200×630 SVG/PNG summary (prompts, commits, top files) for social posts and Open Graph | Every share is an ad for the tool |

Recommended order: U2 → U1 → U3 → U4 → U5 → U7 → U6. Adapters first, because blame and notes are more impressive when they work across agents.

## 4. Beautiful UI

Two surfaces: the **Build Story page** (the product) and a **landing site** (the shop window). Both keep the existing rules in [DESIGN.md](DESIGN.md) (semantic tokens, words first, quiet motion, accessible). This roadmap extends them; it doesn't throw them away.

### 4.1 Design direction: "Editorial dark-room"

- **Look:** an editorial, magazine-like page. Large serif-free display numbers, generous whitespace, a single accent (the voice violet) and a near-black canvas as the default hero mood. Light mode stays first-class.
- **Type:** inline one self-hosted variable font subset (for example Inter or Geist, Latin only, ~60–90 KB as base64) for display and UI, plus a mono for code. This changes the "system fonts only" rule in DESIGN.md §2.2, so the template budget moves from 400 KB to 600 KB. Still no network.
- **Motion:** spring-based, interruptible, short. Cards rise in as replay reaches them, numbers count up once on load, the progress rail fills. All of it off under `prefers-reduced-motion`.
- **Texture:** a faint grain on the hero, hairline borders, no heavy shadows, no glassmorphism.

### 4.2 Build Story page v2

| ID | Feature | Notes |
|---|---|---|
| UI-1 | **Hero summary** | Project name, one-line "built with N prompts in M hours", the four headline numbers, agent icons used |
| UI-2 | **Activity rhythm** | A GitHub-style heatmap of prompts by day/hour, and a session strip showing bursts and breaks |
| UI-3 | **Prompt → commit flow** | A slim flow diagram (prompts on the left, commits on the right, links coloured by confidence). Click to jump |
| UI-4 | **File map** | A treemap of the repo sized by lines changed and tinted by how many prompts touched each file. Click a file to filter the timeline |
| UI-5 | **Command palette (⌘K)** | Search prompt text, files and commits; filter by session, agent, date, confidence |
| UI-6 | **Deep links** | Every prompt and commit has a URL hash (`#p-42`, `#c-3fa2`) with a copy-link button |
| UI-7 | **Views** | Tabs: *Story* (timeline), *Insights* (U5 charts), *Files* (UI-4), *Replay* (fullscreen timelapse) |
| UI-8 | **Virtualised timeline** | Stays smooth at 5,000 prompts |
| UI-9 | **Print / PDF style** | Clean print stylesheet so a story becomes a case-study PDF |
| UI-10 | **Agent badges** | Each prompt shows which agent it went to (Claude Code, Codex, …) |

### 4.3 Landing site (`site/`, deployed to GitHub Pages)

- Hero with a live, embedded Build Story of this very repo (the "it built itself" moment).
- One-line install: `npx said-and-done build`.
- Three feature sections (Story, Blame, PR Action), each with a real screenshot or a short looping capture.
- A gallery of stories from real projects (opt-in submissions via PR).
- Docs pages: install, commands, adapters, privacy model, FAQ.

## 5. Production readiness

### 5.1 Package and distribution

- [ ] Publish to npm as **`said-and-done`** (name is free; `said` is taken). Binary stays `said`.
- [ ] `npx said-and-done build` works from any repo with no clone.
- [x] npm provenance (`--provenance`) and signed releases from CI.
- [ ] Optional Homebrew tap later.

### 5.2 Quality gates (GitHub Actions)

- [x] CI matrix: Ubuntu, macOS, **Windows** × Node 22 and 24.
- [x] Jobs: typecheck, lint, unit tests with coverage (gate: lines 90%, branches 85%; currently 98%), template build and size budget.
- [ ] Playwright end-to-end tests for the page: renders a fixture story, replay works, deep links work, no console errors.
- [ ] Visual regression snapshots (light, dark, mobile).
- [ ] Automated accessibility check with axe on every page state.
- [ ] Performance test: 5,000-prompt story renders in under 1.5 s; `build` handles 200 MB of sessions in under 5 s.
- [x] Linting and formatting with Biome (one fast tool, no plugin sprawl).

### 5.3 Robustness

- [~] **Windows support:** path normalisation, `C--Users-` redaction, LF line endings and test helpers done; confirmed once the Windows CI job is green.
- [x] `said doctor`: checks Node version, git, where sessions were found, adapter detection, and prints fixes.
- [x] Config file `said.config.json` (title, sessions dir, excluded sessions, since/until, output paths) with a JSON schema. Redaction extras and adapters join it in later phases.
- [ ] Custom redaction patterns and an allow-list in config.
- [ ] Session-format drift detection: a `formatVersion` check per adapter with a clear warning.
- [ ] Fuzz tests for the parser and redaction (random and mutated JSONL).
- [ ] Structured errors with stable codes and a `--verbose` / `--debug` mode.

### 5.4 Release and project hygiene

- [x] `LICENSE` (MIT).
- [x] Semantic versioning with Changesets; generated `CHANGELOG.md`.
- [x] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` (how to report a redaction miss privately).
- [x] Issue and PR templates; labels; a "good first issue: write an adapter" track.
- [x] Dependabot and CodeQL.
- [x] Move contest material (`PLAN.md`, `RECORDING.md`, the shortlisting notes) into `docs/archive/contest-2026/`.
- [x] Rewrite `PRD.md` §1–4 for the new positioning. (`ARCHITECTURE.md` gets adapters, notes and blame in Phase 3.)
- [x] Update `CLAUDE.md`: drop the deadline, keep the voice-prompting notes.

## 6. Resume impact

What the finished project lets you claim, with numbers you can fill in:

- *Built and published **Said & Done**, an open-source CLI (npm, N weekly downloads, N GitHub stars) that links AI coding-agent sessions to git history, giving prompt-level provenance for AI-written code.*
- *Designed an adapter architecture supporting 4 coding agents (Claude Code, Codex CLI, Gemini CLI, Aider) behind one typed interface, with a zero-dependency Node 22 core.*
- *Implemented `said blame`, a prompt-level `git blame`, and git-notes provenance that travels with the repository.*
- *Shipped a GitHub Action used in N repositories that summarises the prompts behind each pull request.*
- *Built a single-file, offline React + Tailwind story viewer (virtualised to 5k prompts, WCAG 2.1 AA, CSP-locked, under 600 KB).*
- *Privacy-first by design: default-on secret redaction with fuzz tests; no network access, no telemetry.*
- *Built the original version entirely by voice in 3 days, on camera.*

To make those numbers real:

- [ ] Launch post: "I built a dev tool entirely by voice. Here's every prompt." (with the live story).
- [ ] Show HN, r/ClaudeAI, r/programming, dev.to, X/LinkedIn thread with the share card.
- [ ] Submit the GitHub Action to the Marketplace.
- [ ] Ask 5–10 builders to publish their stories for the gallery.
- [ ] Short demo video (60–90 s) on the landing page and README.

## 7. Phases

| Phase | What | Rough size | Done when |
|---|---|---|---|
| **0. De-contest** | Positioning, LICENSE, archive contest docs, PRD v2, CLAUDE.md update, README rewrite | ½ day | The repo reads as a product, not a submission |
| **1. Foundations** | CI matrix, Biome, coverage, Changesets, config file, `said doctor`, Windows, npm publish 0.2.0 | 2–3 days | `npx said-and-done build` works on all three OSes, CI is green |
| **2. Story page v2** | DESIGN.md v2, font, hero, views, ⌘K, deep links, heatmap, file map, virtualisation, Playwright + axe | 4–6 days | Page passes e2e, a11y and perf gates and looks screenshot-worthy |
| **3. Unique features** | Adapters (U2), blame (U1), git notes (U3), insights (U5), share card (U7) | 1–2 weeks | 1.0.0-beta on npm |
| **4. Distribution** | GitHub Action (U4), landing site, gallery, docs | 3–4 days | Action on the Marketplace, site live |
| **5. Launch** | Launch post, Show HN, video, outreach | 2 days | 1.0.0 released and announced |

Each phase ends with a tagged release, so the git history keeps reading as clear steps.

## 8. Decisions

The first three were confirmed on Oct 18, 2026; the rest are recommendations until a phase needs them.

| Decision | Choice |
|---|---|
| Keep the name "Said & Done"? | **Yes.** It's memorable, the npm name is free, and it still fits ("what was said, what got done") |
| Voice-first or agent-provenance-first? | **Provenance-first**, voice as the signature feature and origin story |
| Inline a web font? | **Yes**, one subset, raises the budget to 600 KB |
| Hosted service (accounts, uploads)? | **Not for 1.0.** Static files + GitHub Pages + the Action cover sharing without running a server. Revisit after launch |
| Support Cursor? | Only if its local logs are readable without reverse-engineering a private database; otherwise skip |
