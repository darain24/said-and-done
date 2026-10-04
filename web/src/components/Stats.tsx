// Stats (FR-41, DESIGN §4.1). Same numbers as `said scan`.
import type { ReactNode } from "react";
import type { Stats as StoryStats } from "../../../src/story/model";
import { formatCount, formatDuration, plural } from "../lib/format";

/** "1h 25m" with small unit letters, so long durations still fit the tile. */
function withSmallUnits(value: string): ReactNode {
  return value.split(/([hms])/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-[0.6em]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// The number scales with the tile (cqi), capped at 40px on phones and 72px from md.
function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="@container flex flex-col-reverse gap-2 rounded-xl bg-sunken p-4 md:p-6">
      <dt className="text-sm font-medium text-muted md:text-base">{label}</dt>
      <dd className="text-[length:min(28cqi,40px)] leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums md:text-[length:min(28cqi,72px)]">
        {value}
      </dd>
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
      <dl className="grid grid-cols-2 gap-3 md:gap-4">
        <StatTile value={formatCount(stats.prompts)} label={stats.prompts === 1 ? "prompt" : "prompts"} />
        <StatTile value={formatCount(stats.words)} label={stats.words === 1 ? "word" : "words"} />
        <StatTile value={formatCount(stats.commits)} label={stats.commits === 1 ? "commit" : "commits"} />
        <StatTile value={withSmallUnits(formatDuration(stats.activeMs))} label="active" />
      </dl>
      <ul className="mt-5 flex flex-col gap-1 text-sm text-muted md:flex-row md:flex-wrap md:gap-x-6">
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
