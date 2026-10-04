// Cuts a small, redacted test fixture out of a real Claude Code session file.
//
//   node --import tsx scripts/make-fixture.ts <session.jsonl> <lines> <out.jsonl>
//
// <lines> is a comma list of 1-based line numbers or ranges, e.g. "1,3,23-25".
// Only fields the parser reads are kept; thinking blocks, tool output and
// file contents are dropped, long text is shortened, and every string goes
// through redactText (CLAUDE.md: never commit raw session data).
import { readFileSync, writeFileSync } from "node:fs";
import { type RedactionHits, REDACTION_KINDS, redactText } from "../src/redact.js";

const KEEP_FIELDS = [
  "type", "uuid", "parentUuid", "sessionId", "timestamp", "cwd", "gitBranch", "isSidechain",
  "isMeta", "userType", "promptId", "promptSource", "origin", "relocatedCwd", "message",
];
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const MAX_TEXT = 300;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const [input, lineSpec, output] = process.argv.slice(2);
if (!input || !lineSpec || !output) {
  console.error("Usage: make-fixture.ts <session.jsonl> <lines> <out.jsonl>");
  process.exit(1);
}

const wanted = new Set(
  lineSpec.split(",").flatMap((part) => {
    const [from, to = from] = part.split("-").map(Number);
    return Array.from({ length: to! - from! + 1 }, (_, i) => from! + i);
  }),
);

const shorten = (text: string, max = MAX_TEXT) => (text.length > max ? `${text.slice(0, max)}…` : text);

function trimBlock(block: Obj, role: string): Obj | null {
  switch (block.type) {
    case "text":
      return { type: "text", text: shorten(String(block.text), role === "assistant" ? 120 : MAX_TEXT) };
    case "tool_result":
      return { type: "tool_result", tool_use_id: block.tool_use_id ?? null, content: "[trimmed]" };
    case "image":
      return { type: "image", source: { type: "base64", media_type: "image/png", data: "" } };
    case "tool_use": {
      const input = (block.input ?? {}) as Obj;
      const name = String(block.name);
      const kept: Obj = {};
      if (EDIT_TOOLS.has(name)) {
        if (typeof input.file_path === "string") kept.file_path = input.file_path;
        if (typeof input.notebook_path === "string") kept.notebook_path = input.notebook_path;
      }
      return { type: "tool_use", id: block.id ?? null, name, input: kept };
    }
    default:
      return null; // thinking and anything unknown
  }
}

function trimEntry(entry: Obj): Obj {
  const out: Obj = {};
  for (const key of KEEP_FIELDS) if (key in entry) out[key] = entry[key]!;
  const message = entry.message as Obj | undefined;
  if (message) {
    const role = String(message.role);
    const content = message.content;
    out.message = {
      role,
      content: typeof content === "string"
        ? shorten(content)
        : Array.isArray(content)
          ? content.map((b) => trimBlock(b as Obj, role)).filter((b): b is Obj => b !== null)
          : null,
    };
  }
  return out;
}

const total = Object.fromEntries(REDACTION_KINDS.map((k) => [k, 0])) as RedactionHits;

function redactDeep(value: Json): Json {
  if (typeof value === "string") {
    const { text, hits } = redactText(value);
    for (const kind of REDACTION_KINDS) total[kind] += hits[kind];
    return text;
  }
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  return value;
}

const lines = readFileSync(input, "utf8").split("\n");
const out = [...wanted]
  .sort((a, b) => a - b)
  .filter((n) => lines[n - 1])
  .map((n) => JSON.stringify(redactDeep(trimEntry(JSON.parse(lines[n - 1]!) as Obj))));

writeFileSync(output, `${out.join("\n")}\n`);
console.log(`${output}: ${out.length} lines, redacted ${JSON.stringify(total)}`);
