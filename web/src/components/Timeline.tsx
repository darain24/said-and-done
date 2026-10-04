// Timeline (FR-42, FR-47, DESIGN §3, §4.2): grouped by session, in time order, on one rail.
import { useMemo } from "react";
import type { Story } from "../../../src/story/model";
import { formatClock, formatDay, plural } from "../lib/format";
import { buildTimeline, type TimelineGroup, type TimelineItem } from "../lib/timeline";
import { CommitMarker } from "./CommitMarker";
import { PromptCard } from "./PromptCard";

function heading(group: TimelineGroup): string {
  const { session, number, continued } = group;
  if (session === null) return "Before the first prompt";
  if (continued) return `Session ${number}, continued`;
  const [startDay, endDay] = [formatDay(session.start), formatDay(session.end)];
  const [startTime, endTime] = [formatClock(session.start), formatClock(session.end)];
  const span =
    startDay !== endDay
      ? [`${startDay} ${startTime} – ${endDay} ${endTime}`]
      : [startDay, startTime === endTime ? startTime : `${startTime}–${endTime}`];
  return [`Session ${number}`, ...span, plural(session.promptCount, "prompt")].join(" · ");
}

/** A card shows its day when a session runs past midnight. */
function startsNewDay(group: TimelineGroup, index: number): boolean {
  const day = (i: number) => {
    const item = group.items[i];
    return item?.kind === "prompt" ? formatDay(item.prompt.at) : undefined;
  };
  let previous = index - 1;
  while (previous >= 0 && day(previous) === undefined) previous--;
  const before = previous >= 0 ? day(previous) : group.session ? formatDay(group.session.start) : undefined;
  return before !== undefined && before !== day(index);
}

const isRevealed = (item: TimelineItem, revealed: number) => (item.kind === "prompt" ? item.prompt.n : item.after) <= revealed;

/**
 * `revealed` is set during replay: the number of the newest prompt showing.
 * Later prompts aren't rendered, and a commit appears with its last prompt.
 */
export function Timeline({ story, revealed }: { story: Story; revealed?: number }) {
  const replaying = revealed !== undefined;
  const groups = useMemo(() => buildTimeline(story), [story]);
  const shown = groups.filter((group) => !replaying || group.items.some((item) => isRevealed(item, revealed)));

  return (
    <section id="timeline" aria-label="Timeline" className="mx-auto max-w-3xl px-4 pb-16 md:px-6">
      {shown.map((group, i) => (
        <div key={i} className={i === 0 ? "mt-12" : "mt-12 border-t border-line pt-6"}>
          <h2 className="mb-4 text-[15px] font-semibold tracking-wide text-muted uppercase">{heading(group)}</h2>
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-y-0 left-3 w-px bg-line md:left-4" />
            <ol className="flex flex-col gap-6 md:gap-8">
              {group.items.map((item, j) =>
                replaying && !isRevealed(item, revealed) ? null : item.kind === "prompt" ? (
                  <PromptCard
                    key={item.prompt.id}
                    prompt={item.prompt}
                    showDay={startsNewDay(group, j)}
                    replay={replaying ? { current: item.prompt.n === revealed } : undefined}
                  />
                ) : (
                  <CommitMarker key={item.commit.sha} commit={item.commit} remoteUrl={story.repo.remoteUrl} replay={replaying} />
                ),
              )}
            </ol>
          </div>
        </div>
      ))}
    </section>
  );
}

/** DESIGN §4.11 */
export function EmptyState() {
  return (
    <section aria-labelledby="empty-heading" className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
      <h2 id="empty-heading" className="text-lg font-semibold">
        No prompts found
      </h2>
      <p className="mt-2 text-base text-muted">
        Check the --since and --exclude-session filters, or run <code className="rounded-md bg-sunken px-1.5 font-mono text-[13px] text-ink">said scan</code> in the repo you recorded.
      </p>
    </section>
  );
}
