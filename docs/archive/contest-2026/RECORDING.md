# Recording runbook and screenplay

How to set up, start, run and finish every recording for the Said & Done voice build, and how each scene feeds the final video. Read sections 1–4 once. Before each session, use section 3 and that day's scene in section 5.

**Your setup:** OBS · webcam bubble · KeyCastr · Wispr Flow (referral account) · Claude Code in the **Claude desktop app**.

> Menu names below match current versions as far as possible. If a label differs slightly on your Mac, pick the closest match.

---

## 1. What gets recorded

| Recording | When | Raw length | Used for |
|---|---|---|---|
| Scene 1: intro and proof | Oct 3, before building | 3–5 min | Setup section of the video |
| Scenes 2–3: kickoff, session parsing | Oct 3 | 45–90 min each | Build montage, raw playlist |
| Scene 4: Build Story page | Oct 4 | 60–90 min | Build montage, raw playlist |
| Scene 5: replay, chapters, badge | Oct 4 | 60–90 min | Build montage, raw playlist |
| Scene 6: ship and bug fix | Oct 5 | 45–60 min | Build montage, raw playlist |
| Scenes 7–8: payoff, outro | Oct 5 | 5–10 min | Payoff and close |
| Scene 0: cold open | Oct 5, last | 1 min | First 15 s of the video |

- **Save location:** `~/Movies/said-and-done/`. **Never inside the repo.** Video files must not be committed.
- **File names:** `YYYY-MM-DD_sNN_topic.mp4`, for example `2026-10-03_s02_kickoff.mp4`.
- **Deliverables:** a 4–6 minute edited video, plus every raw session as an unlisted playlist.

---

## 2. One-time setup (before the first recording, off camera)

### 2.1 Install
```bash
brew install --cask obs keycastr
```
```bash
mkdir -p ~/Movies/said-and-done
```

### 2.2 macOS permissions
System Settings → **Privacy & Security**:

| Section | Turn on for |
|---|---|
| Screen & System Audio Recording | OBS |
| Camera | OBS |
| Microphone | OBS, Wispr Flow |
| Accessibility | KeyCastr, Wispr Flow |
| Input Monitoring | KeyCastr |

Quit and reopen each app after granting permissions.

### 2.3 Fn key
System Settings → **Keyboard** → "Press 🌐 key to" → **Do Nothing**.

This stops the Fn key opening Emoji or macOS Dictation when you meant to talk to Wispr. **Only ever dictate with Wispr Flow.** Never use macOS Dictation or any voice button inside the Claude app.

### 2.4 KeyCastr
1. Open KeyCastr → Preferences.
2. Turn on **display all keystrokes**, not just shortcuts. This overlay is your proof.
3. Use a large font, place it **bottom-right**, and set the fade delay to about 1.5 s.
4. Turn it on and check that it shows keys. Its menu-bar icon toggles it.

### 2.5 Wispr Flow
1. Open Wispr Flow and confirm you're signed in to the **referral account**. Take a screenshot of the account page for your records.
2. Turn on the visible on-screen **Flow indicator** (the bar or bubble that shows while you're dictating).
3. **Dictionary:** add every word listed under "Wispr Flow setup" in `docs/PLAN.md`.
4. **Snippets:** add the three from `docs/PLAN.md`: "run the checks", "commit this", "show me".
5. Write down two hotkeys: **push-to-talk** (usually hold Fn) and **Command Mode**.
6. Practise: dictate into Notes for 10 minutes, then use Command Mode on a selected sentence ("make this shorter").

### 2.6 OBS
**Settings → Video**
- Base (canvas) resolution: **3024×1964**
- Output (scaled) resolution: **1920×1248**
- FPS: **30**

**Settings → Output** (set Output Mode to **Advanced**), Recording tab:
- Recording path: `~/Movies/said-and-done`
- Recording format: **Fragmented MP4**, which survives a crash
- Video encoder: **Apple VT H264 Hardware**

**Settings → Audio**
- Sample rate: 48 kHz
- Desktop Audio: **Disabled**, so notification sounds are never recorded
- Mic/Auxiliary Audio: your microphone. An external mic or headset beats the built-in one.

**Mic filter:** in the Audio Mixer, ⚙ on the mic → Filters → + **Noise Suppression** (RNNoise). When you speak normally, the meter should peak around **−12 dB**: in the yellow, never the red.

**Scene "Build"** (sources from top to bottom):
1. **Video Capture Device** → FaceTime camera. Crop it to a small square or circle (Filters → Crop/Pad, or an Image Mask) and place it **bottom-left**.
2. **macOS Screen Capture** → Display capture → your built-in display, stretched to fill the canvas.
3. **Audio Input Capture** → your mic, unless it's already the global mic.

Layout: face cam bottom-left, Wispr indicator bottom-centre, KeyCastr bottom-right. **Nothing should cover Claude's prompt box.**

**Scene "Talk":** Video Capture Device (same camera) filling the canvas, plus the mic. Use it for the intro and outro.

**Start and stop recording with the mouse** (the Controls dock). An OBS hotkey would show up in KeyCastr and look confusing.

### 2.7 Claude desktop app
1. Zoom in until the text is easy to read at 1080p: **Cmd +** two or three times.
2. **Collapse the sidebar** on camera. It lists other sessions, including the typed planning chat, and recent projects.
3. Keep the account menu closed so your email never appears.
4. Each session: a **new Code tab session** on `~/Documents/Study/Ai/said-and-done`, renamed after its recording (for example "s02 kickoff").
5. Permission mode (the menu by the prompt box): **Accept edits**. File edits then go through without clicks, and you only approve commands.

### 2.8 Privacy
- Turn on **Focus / Do Not Disturb**.
- Quit Mail, WhatsApp, Slack, Messages and anything else that can show notifications.
- Hide desktop icons: right-click the desktop → Use Stacks, or clear the desktop.
- Make a **clean Chrome profile** ("Recording") with no personal bookmarks or saved logins visible.
- Nothing personal in the menu bar.

### 2.9 Test recording (60 s)
1. Open the **Build** scene and a fresh Claude session.
2. Start recording. Hold Fn and say "What files are in this repo?", release, press Enter.
3. Stop recording and watch the file. Check:
   - [ ] Your voice is clear, with no clipping and no echo
   - [ ] The face bubble is visible and doesn't cover anything important
   - [ ] KeyCastr shows the Fn and Enter presses
   - [ ] The Wispr indicator is visible while you talk
   - [ ] Claude's text is readable at 1080p
4. Delete the test file.

---

## 3. Pre-flight checklist (every session, about 2 min)

- [ ] Focus / Do Not Disturb on; chat and mail apps quit
- [ ] Wispr Flow running, signed in, indicator visible
- [ ] KeyCastr on and showing keys
- [ ] OBS: scene **Build**, mic meter moving when you speak
- [ ] Claude desktop app: **new** Code tab session on `said-and-done`, sidebar collapsed, mode **Accept edits**
- [ ] The prompt sheet (this file, section 5) open on a second screen or your phone, **not** on the recorded screen
- [ ] Water nearby, room quiet

**Start:**
1. Click **Start Recording** in OBS.
2. Wait 3 seconds.
3. Say the slate out loud: "Day two, session two: kickoff."
4. First prompt, by voice: "Show me git status and the last three commits." This proves where you're starting from.

---

## 4. Ground rules (read out on camera in scene 1, followed in every session)

**Allowed keyboard use:**
- Wispr push-to-talk and Command Mode hotkeys
- **Enter** to send a prompt
- **Esc** to interrupt Claude
- **Cmd+A then Delete**, only to clear a misheard prompt before sending it
- Mouse clicks: permission approvals, opening pages, scrolling

**Never:** type prompt text, type code, or edit files by hand.

**If you slip:** say so out loud ("I just pressed a key by mistake") and redo it by voice. Don't cut it from the raw footage; being honest is part of the proof.

---

## 5. Screenplay

Prompts are **talking points**. Say them in your own words, the way you'd explain them to a colleague. Reading word for word sounds staged. One feature per prompt. Structure: **goal → context → constraints → done when.**

Every session ends with "run the checks" → "commit this".

### Scene 1: Intro and proof (Oct 3, before scene 2, about 3 min)
**Scene "Talk":**
- "I'm [name]. This task asks you to build something entirely by voice with Wispr Flow. I'm building Said & Done, a tool that turns a voice-built repo into a replayable build story. It'll end up replaying its own construction."

**Switch to "Build":**
1. Open Wispr Flow and show you're signed in. Blur the email in the edit if you like. Show the dictionary words and the three snippets.
2. Show KeyCastr by pressing Fn once.
3. Read out the ground rules from section 4.
4. Show the repo: it holds only the placeholder README, `CLAUDE.md` and the `docs/` folder (plan, PRD, design, architecture, this runbook), all written beforehand and disclosed in the README later.

**Done when:** a viewer knows who you are, what you're building, and why they can trust that it's voice-built.

### Scene 2: Kickoff and scaffold (Oct 3, 45–60 min)
| # | Talking points | Expected result |
|---|---|---|
| P1 | "Read CLAUDE.md and the docs folder and tell me in three lines what we're building and how." | A three-line summary |
| P2 | "Set up project permissions so npm, npx, node and git commands run without asking me." | `.claude/settings.json` allow rules |
| P3 | "Set up the repo: a TypeScript CLI in src tested with node:test, and a Vite React TypeScript app in web with Tailwind v4 and vite-plugin-singlefile. Add root scripts for build, test and dev, and fill in the Commands section of CLAUDE.md. Add a gitignore for node_modules, build output and video files. Done when the tests and the build both pass." | Scaffold, passing checks |
| P4 | "show me": run the web dev server | An empty page in the browser |
| — | "run the checks" → "commit this" | First voice commit |

**Camera beats:** the long P3 prompt spoken in one go; the first voice commit.

### Scene 3: Reading sessions (Oct 3, 60–90 min)
| # | Talking points |
|---|---|
| P5 | "**Plan first, don't write code yet.** I want a session reader: given a repo path, find its Claude Code session files under the dot-claude projects folder, read each JSONL file line by line, keep only real human prompts with their timestamp, session and prompt ID, and collect the file paths from Edit and Write tool calls. Skip sidechains, tool results and unknown entry types, and count them instead of crashing." → review the plan by voice → "Go ahead." |
| P6 | "Before we touch any real session data, add a redaction module: API keys, tokens, emails and home-directory paths get replaced with placeholders. Test it with fake examples." |
| P7 | "Now make two small test fixtures from real sessions in this project, passed through redaction, and write parser tests against them." |
| P8 | "Read the git log with changed files and line stats, and link each prompt to the commit that followed it, using time and overlapping files." |
| P9 | "Add a `said scan` command that prints a summary: prompts, words, sessions, commits, unrecognised entries. Add `--since` and `--exclude-session` options. Then run it on this repo." |

**Camera beat (important):** the first time `said scan` prints **its own voice prompts**. React out loud.

**Done when:** `said scan` reports this repo's voice sessions correctly and the tests pass.

### Scene 4: Build Story page (Oct 4, 60–90 min)
| # | Talking points |
|---|---|
| P10 | "Define the story JSON shape and a `said build` command that writes it into the single-file template's story-data script tag, escaping the less-than character. Add a test that a prompt containing a closing script tag can't break the page." |
| P11 | The long UI prompt. Describe the page: a header with the project name and big stat numbers; a vertical timeline; a card per prompt with time, the prompt text, file chips and the commit with plus/minus line counts; a light/dark toggle; works on mobile; Tailwind only. **Before pressing Enter, select part of it and use Wispr Command Mode** ("make this clearer and more structured"). |
| P12 | 2–3 rounds of visual feedback: "show me", look, then for example "The cards feel cramped, add more spacing. Make the timestamps smaller and grey. The stats should be much bigger." |
| P13 | "Build the story for this repo and open the HTML file directly from the file system, with no server, to prove it works offline." |

**Camera beats:** Command Mode refining a prompt; visual changes appearing after each spoken comment (best montage material).

### Scene 5: Wow features (Oct 4, 60–90 min)
| # | Talking points |
|---|---|
| P14 | "Add a replay mode: a play button steps through the prompts one by one like a timelapse, cards animate in, with pause and 1x, 2x, 4x speed. Use Tailwind transitions." |
| P15 | "Add `said chapters`: given the video start time, print YouTube chapter lines, one per commit, with short titles. Follow YouTube's rules: the first chapter at zero, at least three chapters, each at least ten seconds. Test it." |
| P16 | "Add `said badge`: an SVG 'built by voice' badge with the prompt count, for the README." |
| P17 | *(optional)* "Add `said hook install`: it adds a UserPromptSubmit hook to the project settings for live capture, and tells you exactly what it changed." |

**Camera beats:** the first full replay running; chapter output appearing.

### Scene 6: Ship (Oct 5, 45–60 min)
| # | Talking points |
|---|---|
| P18 | "Write the README: the problem, what Said & Done does, a quick start, how it reads sessions, privacy and redaction, and a 'built by voice' section with the badge. Mention that CLAUDE.md and the docs folder were written before recording started." |
| P19 | "Run `said build` on this repo and look critically at the result: wrong counts, missing prompts, broken layout, anything off. Tell me what you find, then fix the worst one." |
| P20 | "Push to GitHub and publish this repo's build story to GitHub Pages. Tell me the URL." |

**Camera beat (important):** a **real bug** found and fixed by voice (P19). Don't stage one. If nothing is broken, ask for a test of an edge case, such as an empty repo or a session with no commits.

**Done when:** a fresh clone works from the README alone, and the Pages URL loads.

### Scene 7: Payoff (Oct 5, 5 min, after scene 6)
1. "Rebuild the build story with everything up to now and open it."
2. Scroll the timeline. Press **play** on the replay and let it run 20–30 s.
3. "Run said chapters for my demo video." Show the output.
4. Show the README badge on GitHub.

### Scene 8: Outro (Oct 5, scene "Talk", about 30 s)
- "[N] prompts, [M] words spoken, zero lines typed. Said & Done is open source at [repo link]. Thanks to Wispr Flow and Hacker House Goa."

### Scene 0: Cold open (Oct 5, recorded last, 15 s)
The replay playing fast, with you saying: "This task asks you to prove you built by voice. So I built the tool that proves it, by voice, and it recorded its own construction."

---

## 6. When things go wrong

| Problem | What to do |
|---|---|
| Wispr mishears a word | Fix it with Command Mode, or Cmd+A → Delete and say it again. Add the word to the dictionary after the session. |
| Claude goes off track | Press **Esc**, then by voice: "Stop. Undo that and do X instead." |
| Claude asks a question | Answer by voice, or click an option if it gives you choices. |
| An app crashes | **Keep OBS recording.** Restart the app and say what happened. Fragmented MP4 keeps the file safe. |
| OBS crashes | Restart it and start a new recording file with `_partB` added to the name. |
| You type by accident | Say so out loud and redo it by voice. |
| A notification pops up | Note the time; blur or cut it in the edit. |
| Long waits while Claude works | Keep recording. You'll speed it up in the edit. |
| Running out of time | Scene 5 P17 (hook) is optional. Cut it first. |

---

## 7. After each session

1. Click **Stop Recording**.
2. Rename the file using the naming scheme (`YYYY-MM-DD_sNN_topic.mp4`).
3. Open `~/Movies/said-and-done/log.md` and note the good moments, for example `s03 00:42:10 said scan reads its own prompts`.
4. By voice in the next session, or in a quick extra prompt: "Show me the git log for today." Confirm the commits are there.
5. Add any misheard words to the Wispr dictionary.

---

## 8. Editing and upload (Oct 6)

**Tool:** iMovie (free from the App Store) or DaVinci Resolve (free).

**Final cut, 4–6 min:**

| Time | Section | Source |
|---|---|---|
| 0:00 | Hook | Scene 0 |
| 0:15 | Setup and proof | Scene 1 |
| 0:50 | Build montage | Scenes 2–6, using log.md timestamps |
| 3:50 | Payoff | Scene 7 |
| 4:40 | Close | Scene 8 |

**Editing rules:**
- Speed up waiting time 4–8×. **Never speed up your speaking.** Prompts must play at real speed, or it looks faked.
- Add captions for spoken prompts so viewers can read what you said.
- Keep KeyCastr and the Wispr indicator in frame in every montage clip.
- Blur any email, token or notification.

**Upload (YouTube):**
1. The final video as **Unlisted**, with chapters generated by `said chapters` pasted into the description.
2. Every raw session as **Unlisted**, collected in one playlist.
3. Add both links to the README.
4. **Open both links in a private browser window** to check they play while logged out.

**Then follow the submission checklist in `docs/PLAN.md`.** Submit by the afternoon of Oct 6; resubmissions aren't allowed.
