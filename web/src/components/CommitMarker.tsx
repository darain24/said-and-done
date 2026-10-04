// CommitMarker and DiffStat (FR-44, DESIGN §4.5, §4.6).
import type { Commit, LinkConfidence } from "../../../src/story/model";
import { commitUrl, formatCount, plural } from "../lib/format";

const SQUARES = 5;

function DiffStat({ added, removed }: { added: number; removed: number }) {
  const total = added + removed;
  const filled = Math.min(SQUARES, total);
  let adds = total === 0 ? 0 : Math.round((filled * added) / total);
  if (added > 0 && adds === 0) adds = 1;
  if (removed > 0 && adds === filled) adds = filled - 1;
  const dels = filled - adds;

  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {Array.from({ length: SQUARES }, (_, i) => (
        <span key={i} className={i < adds ? "size-2.5 rounded-[2px] bg-add" : i < adds + dels ? "size-2.5 rounded-[2px] bg-del" : "size-2.5 rounded-[2px] bg-line"} />
      ))}
    </span>
  );
}

const CONFIDENCE_TAG: Record<LinkConfidence, { label: string; title: string; className: string } | null> = {
  files: null,
  time: {
    label: "linked by time",
    title: "These prompts came just before this commit, but none of their edits touched its files.",
    className: "rounded bg-warn-soft px-1.5 text-xs font-medium text-warn",
  },
  none: {
    label: "no prompts recorded",
    title: "No recorded prompt led to this commit, for example one made before recording started.",
    className: "text-sm text-muted",
  },
};

export function CommitMarker({ commit, remoteUrl }: { commit: Commit; remoteUrl?: string }) {
  const url = commitUrl(remoteUrl, commit.sha);
  const short = commit.sha.slice(0, 7);
  const tag = CONFIDENCE_TAG[commit.confidence];

  return (
    <li className="relative pl-9 md:pl-12">
      <span aria-hidden="true" className="absolute top-2.5 left-3 size-3 -translate-x-1/2 rotate-45 bg-ink md:left-4" />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1">
        {url ? (
          <a
            href={url}
            aria-label={`Commit ${short} on GitHub`}
            className="font-mono text-[13px] text-ink underline decoration-line underline-offset-2 hover:decoration-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {short}
          </a>
        ) : (
          <span className="font-mono text-[13px] text-ink">{short}</span>
        )}
        <span className="min-w-0 text-base font-medium text-ink wrap-break-word">{commit.subject}</span>
        <span className="flex items-center gap-3 text-sm text-muted tabular-nums">
          <span>{plural(commit.files.length, "file")}</span>
          <span className="text-add">
            <span aria-hidden="true">+{formatCount(commit.added)}</span>
            <span className="sr-only">{plural(commit.added, "line")} added</span>
          </span>
          <span className="text-del">
            <span aria-hidden="true">−{formatCount(commit.removed)}</span>
            <span className="sr-only">{plural(commit.removed, "line")} removed</span>
          </span>
          <DiffStat added={commit.added} removed={commit.removed} />
        </span>
        {tag && (
          <span title={tag.title} className={tag.className}>
            {tag.label}
          </span>
        )}
      </div>
    </li>
  );
}
