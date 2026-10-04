// Header (FR-40, DESIGN §3): title, repo and date range, Replay button, theme toggle.
import type { Story } from "../../../src/story/model";
import { formatDateRange, repoLabel } from "../lib/format";
import { PlayIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

/** DESIGN §4.7. Disabled, with a reason, when there's nothing to replay. */
function ReplayButton({ onReplay, disabled }: { onReplay: () => void; disabled: boolean }) {
  return (
    <button
      id="replay-button"
      type="button"
      onClick={onReplay}
      disabled={disabled}
      title={disabled ? "No prompts to replay" : undefined}
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 md:flex-none dark:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <PlayIcon className="size-4" />
      Replay
    </button>
  );
}

export function Header({ story, onReplay }: { story: Story; onReplay: () => void }) {
  const first = story.prompts[0];
  const last = story.prompts.at(-1);
  const label = repoLabel(story.repo);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 md:flex-row md:items-start md:justify-between md:px-6 md:py-8">
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
        <div className="flex shrink-0 gap-2">
          <ReplayButton onReplay={onReplay} disabled={story.prompts.length === 0} />
          <ThemeToggle />
        </div>
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
