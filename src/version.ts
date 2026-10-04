import { readFileSync } from "node:fs";

/** The package version, read from package.json next to src/ or dist/. */
export function version(): string {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  return pkg.version;
}
