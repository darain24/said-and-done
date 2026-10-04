// Header (FR-40, DESIGN §3): title, repo and date range, theme toggle.
import type { Story } from "../../../src/story/model";
import { formatDateRange, repoLabel } from "../lib/format";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ story }: { story: Story }) {
  const first = story.prompts[0];
  const last = story.prompts.at(-1);
  const label = repoLabel(story.repo);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-6 md:px-6 md:py-8">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight wrap-break-word">{story.title}</h1>
          <p className="mt-1 text-sm font-medium text-muted">
            {story.repo.remoteUrl ? (
              <a
                href={story.repo.remoteUrl}
                className="underline decoration-line underline-offset-2 hover:decoration-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {label}
              </a>
            ) : (
              label
            )}
            {first && last && <> · {formatDateRange(first.at, last.at)}</>}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** DESIGN §4.10: shown when the story was built with --no-redact. */
export function UnredactedBanner() {
  return (
    <div role="note" className="bg-warn-soft text-warn">
      <p className="mx-auto max-w-5xl px-4 py-3 text-sm font-medium md:px-6">This story was built with redaction turned off.</p>
    </div>
  );
}
