// Redaction (FR-20, ARCHITECTURE §6). Runs on prompt text, file paths and
// commit subjects before anything reaches the story model.

export const REDACTION_KINDS = ["key", "secret", "email", "home", "ip"] as const;
export type RedactionKind = (typeof REDACTION_KINDS)[number];
export type RedactionHits = Record<RedactionKind, number>;

export interface Redacted {
  text: string;
  hits: RedactionHits;
}

const placeholder = (kind: RedactionKind) => `[redacted:${kind}]`;
const isPlaceholder = (s: string) => s.startsWith("[redacted:");

interface Rule {
  kind: RedactionKind;
  pattern: RegExp;
  /** Returns the replacement, or null to leave the match alone. */
  replace: (match: string, ...groups: string[]) => string | null;
}

// Path characters for a user name: stops at separators, quotes and brackets,
// and never ends in "." so a sentence's full stop survives.
const NAME = String.raw`[^\\/\s"'\x60<>()[\]{},;]*[^\\/\s"'\x60<>()[\]{},;.]`;

// Order matters: home paths first so user names are gone before any other
// rule sees them, and the catch-all entropy rule last.
const RULES: Rule[] = [
  // Home directories become "~" rather than a placeholder, so paths stay readable.
  { kind: "home", pattern: new RegExp(String.raw`(?<!\w)/(?:Users|home)/${NAME}`, "g"), replace: () => "~" },
  { kind: "home", pattern: new RegExp(String.raw`\b[A-Za-z]:[\\/]Users[\\/]${NAME}`, "g"), replace: () => "~" },
  // Claude Code project folders encode the home path as "-Users-<name>-…".
  { kind: "home", pattern: /(?<![\w-])-(?:Users|home)-[A-Za-z0-9]+(?=-)/g, replace: () => "-~" },

  // NAME_KEY=value, ?token=value, --token=value. The name is kept; only the value goes.
  {
    kind: "key",
    pattern: /\b([A-Za-z0-9_-]*(?:key|token|secret|password|passwd)s?)([ \t]*[=:][ \t]*)(["']?)([^\s"'`,;&]+)\3/gi,
    replace: (_match, name, separator, quote, value) => {
      if (isPlaceholder(value) || /^\d+$/.test(value) || value.startsWith("$")) return null;
      // "the key: it's…" is prose. A colon only counts after something that looks like an identifier.
      const identifier = /[_-]|[a-z][A-Z]|^[A-Z0-9]+$/.test(name);
      if (separator.includes(":") && !quote && !identifier) return null;
      return `${name}${separator}${quote}${placeholder("key")}${quote}`;
    },
  },
  // Known provider prefixes and JWTs.
  {
    kind: "key",
    pattern:
      /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
    replace: () => placeholder("key"),
  },

  {
    kind: "email",
    pattern: /\b([A-Za-z0-9._%+-]+)@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g,
    // git@github.com:owner/repo is an SSH remote, not a person.
    replace: (_match, local) => (local === "git" ? null : placeholder("email")),
  },

  {
    kind: "ip",
    pattern: /(?<![\w.])(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?!\w|\.\d)/g,
    replace: (match) => (match.split(".").every((octet) => Number(octet) <= 255) ? placeholder("ip") : null),
  },

  { kind: "secret", pattern: /[A-Za-z0-9+/_-]{32,}/g, replace: (match) => (looksSecret(match) ? placeholder("secret") : null) },
];

export function redactText(input: string): Redacted {
  const hits = Object.fromEntries(REDACTION_KINDS.map((kind) => [kind, 0])) as RedactionHits;
  let text = input;
  for (const rule of RULES) {
    text = text.replace(rule.pattern, (...args: unknown[]) => {
      const match = args[0] as string;
      const groups = args.slice(1, -2) as string[];
      const replacement = rule.replace(match, ...groups);
      if (replacement === null) return match;
      hits[rule.kind]++;
      return replacement;
    });
  }
  return { text, hits };
}

/**
 * A long run is a secret if it's high-entropy and has a long piece mixing
 * letters and digits. Paths and identifiers are made of short words, and
 * hex pieces up to 40 characters are git shas or UUID parts, so neither counts.
 */
function looksSecret(run: string): boolean {
  if (shannonEntropy(run) < 3.5) return false;
  return run
    .split(/[/+_-]/)
    .filter((piece) => !(/^[0-9a-f]+$/i.test(piece) && piece.length <= 40))
    .some((piece) => piece.length >= 12 && (piece.match(/\d/g)?.length ?? 0) >= 2 && (piece.match(/[A-Za-z]/g)?.length ?? 0) >= 2);
}

function shannonEntropy(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let bits = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}
