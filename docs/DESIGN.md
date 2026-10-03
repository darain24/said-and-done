# Said & Done — Design Reference

The single source for how the Build Story page looks and behaves. Claude (or anyone) designing or changing UI should follow this file. If something isn't covered, extend this file first, then build. Requirements it serves: [PRD.md](PRD.md) §6.5. Implementation constraints: [ARCHITECTURE.md](ARCHITECTURE.md) §8.

---

## 1. Design intent

**"A transcript you can watch."** The page reads like an annotated conversation: what was said, then what changed. The spoken words are the main content; code changes are the evidence underneath.

Personality: calm, precise, editorial. A well-made developer tool, not a marketing site.

### Principles
1. **Words first.** Prompt text is the biggest, most readable thing on every card. Metadata stays small and quiet.
2. **Every number can be checked.** Stats match `said scan`, estimates are labelled, and link confidence is shown.
3. **Readable on a screen recording.** Body text at least 16 px, stats large, and nothing important in low-contrast grey.
4. **Self-contained.** System fonts only, inline SVG icons, no images, nothing from the network.
5. **Quiet motion.** Movement explains progress (replay) and never decorates. Reduced motion is fully respected.

### Don'ts
No gradient hero banners, glassmorphism, emoji as icons, drop-shadow stacks, web fonts, remote images, or carousel-style layouts. No colour that means nothing. No icon without a text label or `aria-label`.

---

## 2. Design tokens

Defined once in `web/src/index.css` as Tailwind v4 `@theme` variables. Dark mode **redefines the same variables** under `.dark`, so components use semantic utilities (`bg-surface`, `text-ink`) and rarely need `dark:` variants.

### 2.1 Colour

| Token | Utility examples | Light | Dark | Use |
|---|---|---|---|---|
| `--color-canvas` | `bg-canvas` | `#FAFAF9` | `#0E0E11` | Page background |
| `--color-surface` | `bg-surface` | `#FFFFFF` | `#17171C` | Cards, header, replay bar |
| `--color-sunken` | `bg-sunken` | `#F3F2F0` | `#121216` | Chips, code, stat tile background |
| `--color-line` | `border-line` | `#E7E5E4` | `#2A2A31` | Borders, dividers, timeline rail |
| `--color-ink` | `text-ink` | `#1C1917` | `#ECECEF` | Main text, prompt text |
| `--color-muted` | `text-muted` | `#6B6560` | `#A1A1AA` | Metadata, labels (AA on surface and canvas) |
| `--color-accent` | `text-accent`, `bg-accent` | `#5B4BC4` | `#A99BFF` | Voice / prompt marks, focus ring, primary button |
| `--color-accent-soft` | `bg-accent-soft` | `#EEEBFB` | `#25213D` | Prompt-number pill, replay highlight |
| `--color-add` | `text-add` | `#1A7F37` | `#3FB950` | Lines added |
| `--color-del` | `text-del` | `#C9252D` | `#F8645A` | Lines removed |
| `--color-warn` | `bg-warn-soft`, `text-warn` | `#9A6700` / soft `#FFF4D6` | `#E3B341` / soft `#2E2614` | "Unredacted" banner, low-confidence link |

**Rules**
- Accent is used for one thing: **the voice**. Prompt numbers, the quote mark, the replay progress, focus rings and the primary button. Never for decoration.
- Green and red only mean added and removed lines.
- Contrast: every text/background pair above meets WCAG AA (≥ 4.5:1). Don't put `text-muted` on `bg-sunken` for text under 14 px.

### 2.2 Typography

System stacks only (Tailwind v4 defaults): `font-sans` (system-ui …) and `font-mono` (ui-monospace, SF Mono, Menlo …).

| Role | Size / line height | Weight | Classes |
|---|---|---|---|
| Stat number | 40/44 desktop, 32/36 mobile | 600 | `text-4xl md:text-[40px] font-semibold tabular-nums tracking-tight` |
| Page title | 28/34 | 650 | `text-[28px] leading-tight font-semibold tracking-tight` |
| Section / session header | 15/20, uppercase | 600 | `text-[15px] font-semibold uppercase tracking-wide text-muted` |
| **Prompt text** | 18/29 desktop, 17/27 mobile | 400 | `text-[17px] md:text-lg leading-relaxed text-ink` |
| Body | 16/24 | 400 | `text-base` |
| Meta / labels | 14/20 | 500 | `text-sm font-medium text-muted` |
| Code, sha, paths | 13/20 | 450 | `font-mono text-[13px]` |

Numbers in stats, times and diff counts always use `tabular-nums`.

### 2.3 Space, size, shape

- 4 px base grid. Use Tailwind's spacing scale; no arbitrary pixel values for spacing.
- Content width: the timeline column is `max-w-3xl` (768 px), centred. The header and stats can widen to `max-w-5xl`.
- Page gutters: `px-4` (16 px) on mobile, `px-6` from `md`.
- Card padding: `p-5 md:p-6`. Gap between cards: `gap-4`. Between sessions: `mt-12`.
- Radius: cards and tiles `rounded-xl` (12 px); chips and buttons `rounded-md`; pills `rounded-full`.
- Borders before shadows: cards are `border border-line`. One shadow only: `shadow-sm`, on the sticky replay bar.
- Touch targets at least 44×44 px.

### 2.4 Tailwind setup (reference)

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-canvas: #FAFAF9;  --color-surface: #FFFFFF;  --color-sunken: #F3F2F0;
  --color-line: #E7E5E4;    --color-ink: #1C1917;      --color-muted: #6B6560;
  --color-accent: #5B4BC4;  --color-accent-soft: #EEEBFB;
  --color-add: #1A7F37;     --color-del: #C9252D;
  --color-warn: #9A6700;    --color-warn-soft: #FFF4D6;
}

@layer base {
  .dark {
    --color-canvas: #0E0E11;  --color-surface: #17171C;  --color-sunken: #121216;
    --color-line: #2A2A31;    --color-ink: #ECECEF;      --color-muted: #A1A1AA;
    --color-accent: #A99BFF;  --color-accent-soft: #25213D;
    --color-add: #3FB950;     --color-del: #F8645A;
    --color-warn: #E3B341;    --color-warn-soft: #2E2614;
  }
  body { @apply bg-canvas text-ink font-sans antialiased; }
}
```

---

## 3. Page layout

### 3.1 Desktop (≥ 768 px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER (surface, border-b)                                           │
│  Said & Done                              [▶ Replay]  [◐ theme]      │
│  darain24/said-and-done · Oct 3 – Oct 5, 2026                        │
├──────────────────────────────────────────────────────────────────────┤
│ STATS (max-w-5xl)                                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│ │   142    │ │  9,814   │ │    37    │ │  6h 12m  │                  │
│ │ prompts  │ │  words   │ │ commits  │ │ active   │                  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│  First prompt → first commit 14m · Longest prompt 312 words ·        │
│  ≈ 3h 20m typing saved (estimate ⓘ)                                 │
├──────────────────────────────────────────────────────────────────────┤
│ TIMELINE (max-w-3xl, centred)                                        │
│  SESSION 1 · FRI OCT 3 · 10:02–11:40 · 23 PROMPTS                   │
│  │                                                                   │
│  ● ┌───────────────────────────────────────────────────────────┐    │
│  │ │ #1 · 10:02 · 41 words                                     │    │
│  │ │ “Read the CLAUDE.md and the docs folder and tell me in    │    │
│  │ │  three lines what we're building and how.”                │    │
│  │ └───────────────────────────────────────────────────────────┘    │
│  ● ┌───────────────────────────────────────────────────────────┐    │
│  │ │ #2 · 10:05 · 88 words                                     │    │
│  │ │ “Set up the repo: a TypeScript CLI in src…”               │    │
│  │ │ [package.json] [src/cli.ts] [web/src/App.tsx] +4 more     │    │
│  │ └───────────────────────────────────────────────────────────┘    │
│  ◆ a1b2c3d  Scaffold CLI and web app   7 files  +412 −0  ■■■■□      │
│  │                                                                   │
├──────────────────────────────────────────────────────────────────────┤
│ FOOTER: how this was built · method notes · generated <time> · v0.1 │
└──────────────────────────────────────────────────────────────────────┘
        [ REPLAY BAR, sticky bottom, only during replay ]
```

### 3.2 Mobile (< 768 px)
- The header stacks: title, then the repo/date line, then the buttons on their own row (Replay grows to fill the width).
- Stats: a 2×2 grid; the secondary stats wrap as a list underneath.
- Timeline: the rail moves to `left-3`, and cards take the full width minus the rail.
- File chips wrap; at most 3 show, then "+N more".
- The replay bar keeps play/pause and the progress bar; speed sits in a compact menu.

### 3.3 Order and landmarks
`<header>` → `<main>` (stats `<section aria-labelledby>`, then timeline `<section>` with an `<ol>` of prompts) → `<footer>`. One `<h1>` (the project title); sessions are `<h2>`.

---

## 4. Components

Each lists its anatomy, states and a class sketch. Class strings must be written out in full (see §8).

### 4.1 `StatTile`
- Anatomy: number (top), label (bottom), optional ⓘ tooltip button.
- `rounded-xl bg-sunken p-4 md:p-5` · number `text-4xl md:text-[40px] font-semibold tabular-nums` · label `text-sm font-medium text-muted`.
- During replay, the number counts up to the current total (400 ms).

### 4.2 `SessionHeader`
- "SESSION 2 · SAT OCT 4 · 14:02–15:40 · 23 PROMPTS" in the section style. `mt-12 mb-4`, with a hairline `border-t border-line pt-6` from the second session on.

### 4.3 `PromptCard` — the main component
- Anatomy:
  1. Meta row: number pill `#12` (`rounded-full bg-accent-soft text-accent text-sm font-semibold px-2.5`) · time · word count (`text-sm text-muted tabular-nums`).
  2. Prompt text: a large accent opening quote mark (`text-accent`) with the text in prompt style. Keep the user's words exactly as they are; just preserve line breaks (`whitespace-pre-wrap`).
  3. File chips row (optional).
- Container: `relative rounded-xl border border-line bg-surface p-5 md:p-6`.
- States:
  - **Default.**
  - **Collapsed long prompt:** over 6 lines, clamp it (`line-clamp-6`) and show a text button "Show full prompt" / "Show less" (`text-sm font-medium text-accent`, with `aria-expanded`).
  - **Current in replay:** `ring-2 ring-accent` plus `bg-accent-soft/40`.
  - **Not yet revealed in replay:** not rendered.
  - **Uncommitted** (after the last commit): a small "not committed" tag in muted text.
- A rail dot sits on the timeline line: `size-3 rounded-full bg-accent ring-4 ring-canvas`.

### 4.4 `FileChip`
- `rounded-md bg-sunken px-2 py-0.5 font-mono text-[13px] text-ink`. Shows the file name; the full relative path is in `title` and an `aria-label`.
- Overflow: a "+N more" chip opens the full list inline.

### 4.5 `CommitMarker`
- Sits between prompt groups on the rail, with a diamond marker (`size-3 rotate-45 bg-ink`).
- Row: short sha (mono, linked to GitHub when the remote is known) · subject (`font-medium`) · "N files" · `+A` (`text-add`) `−D` (`text-del`) · `DiffStat`.
- Link confidence: `files` shows nothing extra; `time` shows a muted "linked by time" tag with a tooltip explaining what that means.
- A commit with no prompts gets a muted "no prompts recorded" tag.

### 4.6 `DiffStat`
- Five squares (`size-2.5 rounded-[2px]`), filled in proportion to additions (`bg-add`) versus deletions (`bg-del`); the rest are `bg-line`. `aria-hidden`, because the numbers beside it carry the meaning.

### 4.7 `ReplayButton` and `ReplayBar`
- Header button: `rounded-md bg-accent text-white px-4 h-11 font-medium` (dark mode: `text-canvas`) with a ▶ icon and the label "Replay".
- Bar: `fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur shadow-sm`, holding:
  - Play/pause button (icon plus `aria-label`).
  - Speed segmented control `1× 2× 4×` (radio group, current option `bg-accent-soft text-accent`).
  - Progress: a full-width track `h-1.5 rounded-full bg-line` with an accent fill; clickable and keyboard-adjustable to jump.
  - Label "Prompt 12 of 142" (`tabular-nums`, `aria-live="polite"`).
  - "Exit" text button.

### 4.8 `ThemeToggle`
- An icon button with three states shown in `aria-label`: System → Light → Dark. The default is System.

### 4.9 `RedactedToken`
- Inline pill showing placeholders like `[redacted:email]`: `rounded bg-warn-soft text-warn font-mono text-[13px] px-1`. Its tooltip reads "Removed before publishing".

### 4.10 `Banner` (unredacted build)
- Full-width strip under the header: `bg-warn-soft text-warn`, reading "This story was built with redaction turned off."

### 4.11 `EmptyState`
- Centred in the timeline column. Heading "No prompts found". Body: "Check the --since and --exclude-session filters, or run `said scan` in the repo you recorded." No illustration.

### 4.12 `Footer`
- `border-t border-line text-sm text-muted`. Contents: "How this was built" (two sentences on the method and link confidence), the honesty note ("Said & Done shows the prompt history. It can't prove the prompts were spoken; the build video does that."), "Generated <date, time, time zone> by Said & Done v<x>", and the badge preview.

---

## 5. States across the page

| State | Behaviour |
|---|---|
| Loading | The story is inline, so there's nothing to load. Render straight away. |
| Empty (0 prompts) | Stats show 0, then `EmptyState`. The Replay button is disabled with a tooltip explaining why. |
| Large (500+ prompts) | Everything still renders. Long prompts are collapsed. No virtualisation needed up to about 2,000 cards. |
| Bad story data | A plain-text error panel: "This Build Story file is damaged. Re-run said build." |
| Storage blocked | The theme toggle still works for the visit, but the choice isn't remembered. |

---

## 6. Replay behaviour

1. Pressing **Replay** scrolls to the timeline, hides all cards, and opens the bar paused at prompt 0. Playback starts automatically after 400 ms.
2. Each tick reveals the next prompt card (and the commit marker when its last prompt has appeared). The new card scrolls smoothly into view, about 40% from the top of the screen.
3. Tick length at 1×: `clamp(1.2 s, 0.6 s + 12 ms × words, 4 s)`. 2× and 4× divide it.
4. Stat tiles count up to the totals at the current position.
5. At the end, the bar shows "Replay finished · Replay again · Exit".
6. Keyboard while replaying: **Space** play/pause, **←/→** step, **1/2/4** speed, **Esc** exit.
7. Exiting shows all cards again at the current scroll position.
8. **Reduced motion:** cards appear without sliding, numbers jump to their values, and scrolling is instant.

## 7. Motion

| Element | Animation |
|---|---|
| Card appears (replay) | opacity 0→1, translateY 8 px→0, 300 ms, `ease-out` |
| Stat count-up | 400 ms, ease-out, rounded to whole numbers |
| Expand prompt | No height animation; switches instantly |
| Theme switch | No transition (avoids a colour flash) |

Use `motion-safe:` and `motion-reduce:` variants. No animation longer than 400 ms.

---

## 8. Implementation rules (Tailwind / React)

- **Full class names only.** Never `` `bg-${tone}` ``. For variants, use a lookup map:
  ```ts
  const confidenceTag = {
    files: "",
    time: "rounded bg-warn-soft px-1.5 text-xs text-warn",
  } as const;
  ```
- Colours come from the tokens in §2.1 only. No raw hex values in components and no default palette colours (`bg-violet-600`).
- Icons are inline SVG components (`currentColor`, `size-4` or `size-5`, `aria-hidden` when there's a label). No icon library.
- **Theme:** a tiny inline script in `index.html` sets `class="dark"` on `<html>` before first paint, based on the saved choice or `prefers-color-scheme`, inside `try/catch`.
- Times are shown in the viewer's local time zone, with the zone named in the footer.
- **Accessibility:** focus rings are `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`. Every interactive element is a real `<button>` or `<a>`.
- **Microcopy:** sentence case and plain words. Numbers use thousands separators (`9,814`). Durations look like `6h 12m`, `14m` or `45s`.
