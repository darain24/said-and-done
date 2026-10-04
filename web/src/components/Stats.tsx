// Stats (FR-41, DESIGN §4.1). Same numbers as `said scan`.
import type { ReactNode } from "react";
import type { Stats as StoryStats } from "../../../src/story/model";
import { formatCount, formatDuration, plural } from "../lib/format";

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-sunken p-4 md:p-5">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="text-[32px] leading-9 font-semibold tracking-tight tabular-nums md:text-[40px] md:leading-11">{value}</dd>
    </div>
  );
}

const Value = ({ children }: { children: ReactNode }) => <span className="font-medium text-ink tabular-nums">{children}</span>;

export function Stats({ stats }: { stats: StoryStats }) {
  return (
    <section aria-labelledby="stats-heading" className="mx-auto max-w-5xl px-4 pt-8 md:px-6">
      <h2 id="stats-heading" className="sr-only">
        Totals
      </h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile value={formatCount(stats.prompts)} label={stats.prompts === 1 ? "prompt" : "prompts"} />
        <StatTile value={formatCount(stats.words)} label={stats.words === 1 ? "word" : "words"} />
        <StatTile value={formatCount(stats.commits)} label={stats.commits === 1 ? "commit" : "commits"} />
        <StatTile value={formatDuration(stats.activeMs)} label="active" />
      </dl>
      <ul className="mt-4 flex flex-col gap-1 text-sm text-muted md:flex-row md:flex-wrap md:gap-x-6">
        <li>
          First prompt → first commit{" "}
          <Value>{stats.firstPromptToFirstCommitMs === null ? "—" : formatDuration(stats.firstPromptToFirstCommitMs)}</Value>
        </li>
        {stats.longestPrompt && (
          <li>
            Longest prompt{" "}
            <a
              href={`#prompt-${stats.longestPrompt.n}`}
              className="underline decoration-line underline-offset-2 hover:decoration-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Value>{plural(stats.longestPrompt.words, "word")}</Value> (#{stats.longestPrompt.n})
            </a>
          </li>
        )}
        <li>
          ≈ <Value>{formatDuration(stats.typingSavedMs)}</Value> typing saved{" "}
          <span>(estimate: typing at 40 wpm vs speaking at 150 wpm)</span>
        </li>
      </ul>
    </section>
  );
}
