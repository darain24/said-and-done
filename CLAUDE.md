# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Said & Done is a submission for the Wispr Flow shortlisting task (deadline Oct 6, 2026, 11:59 PM). The scaffold is in place (CLI, web app, build and test scripts); features aren't built yet. The specs live in `docs/`. Read the relevant one before starting any piece of work:

| Doc | Use it for |
|---|---|
| `docs/PRD.md` | What to build. Requirement IDs (`FR-n`, `NFR-n`), priorities (P0/P1/P2), acceptance criteria, metric definitions |
| `docs/ARCHITECTURE.md` | How to build it: repo layout, parsing rules, correlation algorithm, story model, injection, testing |
| `docs/DESIGN.md` | **Any UI work**: tokens, typography, layout, components, replay behaviour, Tailwind rules. Follow it exactly; extend it before inventing new patterns |
| `docs/PLAN.md` | Schedule, demo plan, submission checklist |
| `docs/RECORDING.md` | Recording runbook (for the user, not for code) |

Reference requirement IDs in commit messages and test names where it helps (for example `FR-2: exclude bash-input entries`).

## Working in this repo: prompts arrive by voice

All project code is written from prompts the user dictates through Wispr Flow, recorded on camera. This affects how you work:

- Prompts may contain transcription errors: misheard technical words, spelled-out symbols ("slash", "dot tsx"), or missing punctuation. Read them for intent. If a misheard word changes the meaning, ask a short question instead of guessing.
- The user can't easily type. Ask questions they can answer in a sentence or by choosing an option, and never ask them to paste or edit text by hand.
- Keep replies short and easy to scan on a screen recording. Lead with what changed and how to see it.
- Commit roughly once per feature with a descriptive message, so the git history reads as clear steps. Don't push unless asked.

## Architecture in brief

Full detail in `docs/ARCHITECTURE.md`.

- **`src/`**: Node 22 + TypeScript CLI (`said scan`, `build`, `chapters`, `badge`, `hook install`). **Zero runtime npm dependencies**; Node built-ins only. Tested with `node:test`.
- **`web/`**: Vite + React + TypeScript, Tailwind v4 via `@tailwindcss/vite`. `vite-plugin-singlefile` bundles it **once, at package build time,** into `dist/story-template.html`.
- **Data flow:** session JSONL + git log → locate → parse → filter/dedupe → redact → correlate → stats → `Story` (`src/story/model.ts`) → injected into the template's `<script id="story-data" type="application/json">__SAID_STORY__</script>`, escaping `<` as `\u003c`. The output must open offline from `file://`. Never fetch anything at runtime.
- **Redaction** runs immediately after parsing, so nothing unredacted reaches the model or the output.

### Rules that are easy to get wrong
- **Session matching:** the project folder name replaces *every* non-alphanumeric character with `-`. Treat it as a hint only. Keep entries whose `cwd` is inside the repo root, because sessions can move between projects and run from subfolders.
- **Human prompts:** exclude tool results, sidechains, `isMeta`, and texts starting with `<command-name>`, `<command-message>`, `<local-command-stdout>`, `<local-command-caveat>`, `<bash-input>`, `<bash-stdout>`, `<system-reminder>` or `[Request interrupted`. `promptSource` must never be used to claim a prompt was spoken.
- **Fixtures:** real session data goes into `test/fixtures/` only after redaction and trimming. Never commit raw session files; this repo is public.
- **Tailwind:** write class names in full (never `` `bg-${x}` ``), and use lookup maps for variants. Colours come only from the semantic tokens in `docs/DESIGN.md` §2. Those tokens are redefined under `.dark`, so `dark:` variants are only for exceptions.

## Commands

npm workspaces: the root package is the CLI, `web/` is the React app. Run everything from the repo root.

```bash
npm install                    # once; installs the root and web/ workspace
npm run build                  # web/ → dist/story-template.html (checked), then tsc → dist/cli.js
npm test                       # every test/**/*.test.ts with node:test (via tsx)
npm run dev                    # Vite dev server for web/
npm run typecheck              # tsc for src/, test/, scripts/ and web/
node dist/cli.js --help        # run the built CLI
```

Single test file or test name:

```bash
node --import tsx --test test/cli.test.ts
node --import tsx --test --test-name-pattern="version" test/cli.test.ts
```

- `scripts/build-template.ts` fails the build if the template is missing the `__SAID_STORY__` placeholder (it must appear exactly once), the CSP meta tag, inlined assets or the design tokens, or is over 400 KB.
- The CSP tag is added by a build-only Vite plugin in `web/vite.config.ts`, so the dev server isn't blocked by it.
- Never write the literal `__SAID_STORY__` in web source: it would end up in the bundle and break the placeholder check.
