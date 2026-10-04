// Page formatting (DESIGN §8 microcopy). Counts and durations come from the
// CLI's own helpers, so every number matches `said scan`.
import { formatCount } from "../../../src/format";

export { formatCount, formatDuration } from "../../../src/format";

const clock = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "10:02", in the viewer's time zone. */
export const formatClock = (iso: string) => clock.format(new Date(iso));

/** "Fri Oct 3" */
export const formatDay = (iso: string) => day.format(new Date(iso)).replace(",", "");

/** "Oct 3 – 5, 2026", or "Oct 3, 2026" for a single day. */
export const formatDateRange = (startIso: string, endIso: string) => date.formatRange(new Date(startIso), new Date(endIso));

/** "1 prompt", "23 prompts" */
export const plural = (n: number, word: string) => `${formatCount(n)} ${n === 1 ? word : `${word}s`}`;

/** "src/cli.ts" → "cli.ts" */
export const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** "owner/repo" from an https remote, or the folder name. */
export function repoLabel(repo: { name: string; remoteUrl?: string }): string {
  if (!repo.remoteUrl) return repo.name;
  const path = new URL(repo.remoteUrl).pathname.replace(/^\//, "");
  return path || repo.name;
}

/** A link to the commit on GitHub, when the remote is GitHub. */
export function commitUrl(remoteUrl: string | undefined, sha: string): string | undefined {
  if (!remoteUrl || new URL(remoteUrl).hostname !== "github.com") return undefined;
  return `${remoteUrl}/commit/${sha}`;
}
