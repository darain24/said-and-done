// said.config.json (ROADMAP §5.3): per-repo defaults, so flags don't need repeating.
// Flags always win over the file; excluded sessions from both are combined.
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const CONFIG_FILE = "said.config.json";

export interface SaidConfig {
  title?: string;
  /** Resolved against the config file's folder. */
  sessionsDir?: string;
  since?: string;
  until?: string;
  excludeSessions?: string[];
  /** Where `said build` writes the page. Resolved against the config file's folder. */
  out?: string;
  /** Where `said badge` writes the badge. Resolved against the config file's folder. */
  badgeOut?: string;
}

export interface LoadedConfig {
  config: SaidConfig;
  /** The file it came from, or undefined when there isn't one. */
  path?: string;
}

/** The config file is unreadable or has the wrong shape (exit code 1). */
export class ConfigError extends Error {}

const STRING_KEYS = ["title", "sessionsDir", "since", "until", "out", "badgeOut"] as const;
const PATH_KEYS = ["sessionsDir", "out", "badgeOut"] as const;
const KNOWN_KEYS = new Set<string>(["$schema", ...STRING_KEYS, "excludeSessions"]);

/**
 * Reads `explicit` if given (it must exist), otherwise `said.config.json` at the
 * repo root if there is one.
 */
export async function loadConfig(repoRoot: string, explicit?: string): Promise<LoadedConfig> {
  const path = explicit === undefined ? join(repoRoot, CONFIG_FILE) : resolve(explicit);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (explicit === undefined && (error as NodeJS.ErrnoException).code === "ENOENT") return { config: {} };
    throw new ConfigError(`Couldn't read ${path}: ${(error as Error).message}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ConfigError(`${path} isn't valid JSON: ${(error as Error).message}`);
  }
  return { config: validate(raw, path), path };
}

function validate(raw: unknown, path: string): SaidConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new ConfigError(`${path} should hold a JSON object.`);
  const input = raw as Record<string, unknown>;

  const unknown = Object.keys(input).filter((key) => !KNOWN_KEYS.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(
      `${path} has unknown ${unknown.length === 1 ? "key" : "keys"} ${unknown.map((k) => `"${k}"`).join(", ")}. Known keys: ${[...KNOWN_KEYS].slice(1).join(", ")}.`,
    );
  }

  const config: SaidConfig = {};
  for (const key of STRING_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "string") throw new ConfigError(`${path}: "${key}" should be a string.`);
    config[key] = value;
  }
  const excluded = input.excludeSessions;
  if (excluded !== undefined) {
    if (!Array.isArray(excluded) || !excluded.every((id) => typeof id === "string")) {
      throw new ConfigError(`${path}: "excludeSessions" should be a list of session ids.`);
    }
    config.excludeSessions = excluded;
  }
  for (const key of PATH_KEYS) {
    if (config[key] !== undefined) config[key] = resolve(dirname(path), config[key]);
  }
  return config;
}
