# Said & Done

**Turn a voice-built repo into a replayable Build Story.**

Said & Done reads a repo's Claude Code session history and its git log, and produces one self-contained HTML page: every prompt, the files it touched, the commit it led to, the totals, and a timelapse replay of the whole build. It also generates YouTube chapter markers and a "built by voice" README badge.

It's being built entirely by voice with [Wispr Flow](https://wisprflow.ai) and Claude Code for the Wispr Flow × Hacker House Goa shortlisting task. When it's finished, it will replay its own construction.

> 🚧 **In progress.** This README is a placeholder. The full README, with a quick start, demo video and the project's own Build Story, will be written by voice before submission.

## Docs

| Doc | What's in it |
|---|---|
| [PRD](docs/PRD.md) | Problem, users, requirements (FR/NFR IDs), metrics, scope |
| [Architecture](docs/ARCHITECTURE.md) | Repo layout, session parsing, prompt-to-commit linking, story model, testing |
| [Design](docs/DESIGN.md) | Design tokens, layout, components and replay behaviour for the Build Story page |
| [Plan](docs/PLAN.md) | Schedule, voice-build workflow, demo video, submission checklist |
| [Recording](docs/RECORDING.md) | Screen-recording setup and scene-by-scene screenplay |

## How this repo is built

All code is written by an AI coding agent (Claude Code) from prompts spoken through Wispr Flow, recorded on camera with a keystroke overlay. The files in `docs/`, `CLAUDE.md` and this placeholder README were written before recording started; everything else comes from voice prompts.
