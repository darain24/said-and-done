// Text formatting shared by CLI output (DESIGN §8 microcopy rules).

/** 9814 → "9,814" */
export const formatCount = (n: number) => n.toLocaleString("en-US");

/** "45s", "14m", "6h 12m", "2h" */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
}

/** "Oct 3, 11:42" in the given time zone (default: this machine's). */
export function formatTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone,
  }).format(new Date(iso));
}

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** First line, whitespace collapsed, cut to `max` characters with an ellipsis. */
export function preview(text: string, max: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
