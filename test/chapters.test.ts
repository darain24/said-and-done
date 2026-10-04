import assert from "node:assert/strict";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";
import { chapterTitle, formatOffset, makeChapters, TooFewChaptersError } from "../src/commands/chapters.js";
import { capture } from "./helpers/cli.js";
import { makeTempRepo } from "./helpers/git-repo.js";

const START = Date.parse("2026-10-04T10:00:00Z");
/** A commit `seconds` into the video. */
const at = (seconds: number, subject: string) => ({ at: new Date(START + seconds * 1000).toISOString(), subject });
const lines = (chapters: { offsetMs: number; title: string }[]) => chapters.map((c) => `${formatOffset(c.offsetMs)} ${c.title}`);

test("FR-32: offsets are m:ss under an hour and h:mm:ss from an hour", () => {
  const table: [number, string][] = [
    [0, "0:00"],
    [9_999, "0:09"],
    [65_000, "1:05"],
    [3_599_000, "59:59"],
    [3_600_000, "1:00:00"],
    [3_729_000, "1:02:09"],
    [36_000_000, "10:00:00"],
  ];
  for (const [ms, expected] of table) assert.equal(formatOffset(ms), expected, `${ms} ms`);
});

test("FR-32: titles drop requirement IDs and are cut to 60 characters", () => {
  const table: [string, string][] = [
    ["FR-47: Replay mode steps through the prompts", "Replay mode steps through the prompts"],
    ["FR-40–FR-46, FR-48: Build Story page with header", "Build Story page with header"],
    ["FR-1, FR-6, FR-30: said scan", "said scan"],
    ["Scaffold the CLI and the web app", "Scaffold the CLI and the web app"],
    ["FR-2:", "FR-2:"],
    ["  Fix   the\tparser  ", "Fix the parser"],
  ];
  for (const [subject, expected] of table) assert.equal(chapterTitle(subject), expected);

  const long = chapterTitle("Make the timeline rail line up with the session headers on every screen size, including phones");
  assert.ok(long.length <= 60, long);
  assert.equal(long, "Make the timeline rail line up with the session headers on…");
});

test("FR-32: the first chapter is an Intro at 0:00, then one per commit", () => {
  const chapters = makeChapters([at(300, "FR-1: Add the CLI"), at(60, "Scaffold"), at(900, "Add tests")], START);
  assert.deepEqual(lines(chapters), ["0:00 Intro", "1:00 Scaffold", "5:00 Add the CLI", "15:00 Add tests"]);
});

test("FR-32: only commits between start and end count", () => {
  const commits = [at(-60, "Before recording"), at(60, "One"), at(120, "Two"), at(180, "Three"), at(4000, "After recording")];
  const chapters = makeChapters(commits, START, START + 600_000);
  assert.deepEqual(lines(chapters), ["0:00 Intro", "1:00 One", "2:00 Two", "3:00 Three"]);
});

test("FR-32: a commit right at the start replaces the Intro, so the first chapter stays at 0:00", () => {
  const chapters = makeChapters([at(4, "Scaffold"), at(60, "One"), at(120, "Two")], START);
  assert.deepEqual(lines(chapters), ["0:00 Scaffold", "1:00 One", "2:00 Two"]);
});

test("FR-32: chapters under 10 s merge into the next one", () => {
  const commits = [at(60, "One"), at(65, "Quick fix"), at(69, "Another fix"), at(120, "Two"), at(129, "Typo"), at(200, "Three")];
  const chapters = makeChapters(commits, START);
  assert.deepEqual(lines(chapters), ["0:00 Intro", "1:00 Another fix", "2:00 Typo", "3:20 Three"]);
  for (let i = 1; i < chapters.length; i++) assert.ok(chapters[i]!.offsetMs - chapters[i - 1]!.offsetMs >= 10_000);
});

test("FR-32: exactly 10 s is long enough", () => {
  const chapters = makeChapters([at(10, "One"), at(20, "Two"), at(30, "Three")], START);
  assert.deepEqual(lines(chapters), ["0:00 Intro", "0:10 One", "0:20 Two", "0:30 Three"]);
});

test("FR-32: a last chapter under 10 s before --end merges into the one before it", () => {
  const chapters = makeChapters([at(60, "One"), at(120, "Two"), at(180, "Three"), at(595, "Final commit")], START, START + 600_000);
  assert.deepEqual(lines(chapters), ["0:00 Intro", "1:00 One", "2:00 Two", "3:00 Final commit"]);
});

test("FR-32: fewer than 3 chapters is an error that explains why", () => {
  assert.throws(() => makeChapters([], START), TooFewChaptersError);
  assert.throws(() => makeChapters([at(60, "Only one")], START), /at least 3 chapters.*gives 2 \(1 commit between/);
  // Three commits, but two are within 10 s of each other.
  assert.throws(() => makeChapters([at(60, "One"), at(65, "Two")], START), /gives 2/);
});

test("FR-32: said chapters prints the lines for the repo's commits", async (t) => {
  const repo = makeTempRepo();
  t.after(() => repo.remove());
  repo.commit("2026-10-04T09:00:00Z", "Before recording", { "README.md": "r\n" });
  repo.commit("2026-10-04T10:02:30Z", "FR-1: Scaffold the CLI", { "src/cli.ts": "x\n" });
  repo.commit("2026-10-04T10:14:00Z", "FR-2, FR-3: Parse the session files", { "src/parse.ts": "x\n" });
  repo.commit("2026-10-04T11:05:09Z", "FR-31: Write the Build Story page", { "src/build.ts": "x\n" });

  const c = capture();
  assert.equal(await run(["chapters", "--repo", repo.root, "--start", "2026-10-04T10:00:00Z"], c.io), EXIT.ok);
  assert.deepEqual(c.out, ["0:00 Intro", "2:30 Scaffold the CLI", "14:00 Parse the session files", "1:05:09 Write the Build Story page"]);
  assert.deepEqual(c.err, []);

  const ended = capture();
  assert.equal(await run(["chapters", "--repo", repo.root, "--start", "2026-10-04T10:00:00Z", "--end", "2026-10-04T10:10:00Z"], ended.io), EXIT.usage);
  assert.match(ended.err.join("\n"), /YouTube needs at least 3 chapters/);
  assert.deepEqual(ended.out, []);
});

test("FR-32: said chapters needs a valid --start", async () => {
  const missing = capture();
  assert.equal(await run(["chapters"], missing.io), EXIT.usage);
  assert.match(missing.err.join("\n"), /--start is required/);

  const bad = capture();
  assert.equal(await run(["chapters", "--start", "yesterday"], bad.io), EXIT.usage);
  assert.match(bad.err.join("\n"), /--start needs a time like/);

  const backwards = capture();
  assert.equal(await run(["chapters", "--start", "2026-10-04T10:00:00Z", "--end", "2026-10-04T09:00:00Z"], backwards.io), EXIT.usage);
  assert.match(backwards.err.join("\n"), /--end must be after --start/);
});

test("FR-35: said chapters --help shows an example", async () => {
  const c = capture();
  assert.equal(await run(["chapters", "--help"], c.io), EXIT.ok);
  assert.match(c.out.join("\n"), /Example:\n {2}said chapters --start/);
});
