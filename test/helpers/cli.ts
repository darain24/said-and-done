// A temp repo plus session files, and captured CLI output, for command tests.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeTempRepo } from "./git-repo.js";

export function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (l: string) => out.push(l), err: (l: string) => err.push(l) } };
}

/** A temp repo with two commits and a sessions folder with two sessions in it. */
export function sessionsFixture(t: { after: (fn: () => void) => void }) {
  const repo = makeTempRepo();
  const sessions = mkdtempSync(join(tmpdir(), "said-sessions-"));
  t.after(() => {
    repo.remove();
    rmSync(sessions, { recursive: true, force: true });
  });

  const sha = repo.commit("2026-10-04T10:10:00Z", "Add the CLI", { "src/cli.ts": "x\n" });
  repo.commit("2026-10-04T08:00:00Z", "Before recording", { "README.md": "r\n" });

  const line = (sessionId: string, at: string, extra: object) =>
    JSON.stringify({ sessionId, cwd: repo.root, timestamp: `2026-10-04T${at}Z`, uuid: crypto.randomUUID(), ...extra });
  const prompt = (sessionId: string, at: string, text: string) =>
    line(sessionId, at, { type: "user", promptId: crypto.randomUUID(), message: { role: "user", content: text } });
  const write = (at: string, file: string) =>
    line("voice-1111", at, { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: crypto.randomUUID(), name: "Write", input: { file_path: join(repo.root, file) } }] } });

  writeFileSync(join(sessions, "typed.jsonl"), [
    prompt("typed-2222", "09:00:00.000", "planning notes, typed"),
    JSON.stringify({ type: "custom-title" }),
  ].join("\n"));
  writeFileSync(join(sessions, "voice.jsonl"), [
    prompt("voice-1111", "10:00:00.000", "Add a CLI that says hello to jane@example.com"),
    write("10:01:00.000", "src/cli.ts"),
    "{broken",
    prompt("voice-1111", "10:20:00.000", "Now add tests"),
  ].join("\n"));

  return { repo, sessions, sha, flags: ["--repo", repo.root, "--sessions-dir", sessions] };
}
