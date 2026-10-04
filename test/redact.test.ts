import assert from "node:assert/strict";
import { test } from "node:test";
import { type RedactionKind, redactText } from "../src/redact.js";

// Fake credentials are assembled at run time so this public repo never holds
// a string that a secret scanner would flag as a real token.
const body = (n: number) => "Ab3dE5gH7jK9mN2pQ4rS6tV8wX0yZ1cF".repeat(4).slice(0, n);

const mustRedact: [name: string, input: string, expected: string, kind: RedactionKind][] = [
  ["Anthropic key", `my key is ${"sk-" + "ant-api03-" + body(40)}`, "my key is [redacted:key]", "key"],
  ["OpenAI project key", `use ${"sk-" + "proj-" + body(40)} here`, "use [redacted:key] here", "key"],
  ["GitHub token", "gh" + "p_" + body(36), "[redacted:key]", "key"],
  ["GitHub fine-grained token", "github" + "_pat_" + body(40), "[redacted:key]", "key"],
  ["Slack token", "xo" + "xb-1234567890-" + body(20), "[redacted:key]", "key"],
  ["AWS access key (AWS docs example)", "AK" + "IAIOSFODNN7EXAMPLE", "[redacted:key]", "key"],
  ["Google API key", "AI" + "za" + body(35), "[redacted:key]", "key"],
  ["JWT", `Bearer ${"ey" + "J" + body(20)}.${"ey" + "J" + body(20)}.${body(20)}`, "Bearer [redacted:key]", "key"],
  ["env assignment", "ANTHROPIC_API_KEY=whatever123", "ANTHROPIC_API_KEY=[redacted:key]", "key"],
  ["quoted yaml value", 'DB_PASSWORD: "hunter2"', 'DB_PASSWORD: "[redacted:key]"', "key"],
  ["CLI flag", "said build --token=abc123xyz", "said build --token=[redacted:key]", "key"],
  ["URL query", "https://example.test/hook?token=abc123xyz&x=1", "https://example.test/hook?token=[redacted:key]&x=1", "key"],
  ["email", "mail jane.doe@example.com today", "mail [redacted:email] today", "email"],
  ["macOS home", "/Users/jane/Documents/app/src/index.ts", "~/Documents/app/src/index.ts", "home"],
  ["Linux home", "cd /home/jane/app", "cd ~/app", "home"],
  ["Windows home", String.raw`C:\Users\jane\app`, String.raw`~\app`, "home"],
  ["file URL", "open file:///Users/jane/app/build-story.html", "open file://~/app/build-story.html", "home"],
  ["home at end of sentence", "It lives in /Users/jane.", "It lives in ~.", "home"],
  ["Claude project folder", "~/.claude/projects/-Users-jane-Documents-app/", "~/.claude/projects/-~-Documents-app/", "home"],
  ["private IP 192.168", "ssh 192.168.1.20", "ssh [redacted:ip]", "ip"],
  ["private IP 10/8", "host 10.0.0.5.", "host [redacted:ip].", "ip"],
  ["private IP 172.16/12", "172.16.4.2:8080", "[redacted:ip]:8080", "ip"],
  ["high-entropy string", `value ${body(40)} end`, "value [redacted:secret] end", "secret"],
  ["base64 with separators", `${body(16)}/${body(16)}+${body(8)}==`, "[redacted:secret]==", "secret"],
];

for (const [name, input, expected, kind] of mustRedact) {
  test(`FR-20: redacts ${name}`, () => {
    const { text, hits } = redactText(input);
    assert.equal(text, expected);
    assert.ok(hits[kind] >= 1, `expected a ${kind} hit`);
  });
}

const mustKeep: [name: string, input: string][] = [
  ["short git sha", "fixed in d85c4e6"],
  ["full git sha", "commit 3e930b8f1c2d4a5b6c7d8e9f0a1b2c3d4e5f6a7b"],
  ["UUID in prose", "session 0f8e2c7a-3b1d-4e5f-9a6b-7c8d9e0f1a2b had 12 prompts"],
  ["UUID file name", "session-0f8e2c7a-3b1d-4e5f-9a6b-7c8d9e0f1a2b.jsonl"],
  ["repo path", "~/Documents/Study/Ai/said-and-done/src/sessions/parse.ts"],
  ["relative path with digits", "hhgoa_task4/web/src/components/PromptCard.tsx"],
  ["long identifier", "handlePromptCardKeyboardNavigationEvent"],
  ["package versions", "npm i vite@8.3.2 @tailwindcss/vite react@19.3.0"],
  ["SSH remote", "git@github.com:owner/repo.git"],
  ["public IP", "dns is 8.8.8.8"],
  ["version number", "Node 10.0.0 and v10.2.3.4"],
  ["numeric setting", "MAX_TOKENS=4096"],
  ["env reference", "TOKEN=$GITHUB_TOKEN"],
  ["prose with key and colon", "Turn the key: it opens the door."],
  ["word containing sk-", "the task-runner script"],
  ["existing placeholder", "API_KEY=[redacted:key] and [redacted:email]"],
];

for (const [name, input] of mustKeep) {
  test(`FR-20: keeps ${name}`, () => {
    const { text, hits } = redactText(input);
    assert.equal(text, input);
    assert.deepEqual(Object.values(hits), [0, 0, 0, 0, 0]);
  });
}

test("FR-20: counts hits per kind", () => {
  const input = `a@example.com b@example.com /Users/jane/x 10.0.0.1 ${"gh" + "p_" + body(36)}`;
  const { hits } = redactText(input);
  assert.deepEqual(hits, { key: 1, secret: 0, email: 2, home: 1, ip: 1 });
});

test("FR-20: redacting twice changes nothing more", () => {
  const once = redactText(mustRedact.map(([, input]) => input).join("\n"));
  const twice = redactText(once.text);
  assert.equal(twice.text, once.text);
  assert.deepEqual(Object.values(twice.hits), [0, 0, 0, 0, 0]);
});
