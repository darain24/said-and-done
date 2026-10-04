// PromptCard (FR-43, DESIGN §4.3, §4.4, §4.9): the spoken words come first.
import { useLayoutEffect, useRef, useState } from "react";
import type { Prompt } from "../../../src/story/model";
import { fileName, formatClock, formatDay, plural } from "../lib/format";
import { useMediaQuery } from "../lib/useMediaQuery";

const REDACTED = /(\[redacted:[a-z]+\])/;

function PromptText({ text }: { text: string }) {
  return text.split(REDACTED).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} title="Removed before publishing" className="rounded bg-warn-soft px-1 font-mono text-[13px] text-warn">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function FileChips({ files }: { files: string[] }) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const shown = open ? files : files.slice(0, wide ? 6 : 3);
  const hidden = files.length - shown.length;

  return (
    <ul aria-label="Files touched" className="mt-4 flex flex-wrap gap-2">
      {shown.map((path) => (
        <li key={path} title={path} className="max-w-full truncate rounded-md bg-sunken px-2 py-0.5 font-mono text-[13px] text-ink">
          <span aria-hidden="true">{fileName(path)}</span>
          <span className="sr-only">{path}</span>
        </li>
      ))}
      {hidden > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="relative rounded-md border border-line px-2 py-0.5 text-[13px] font-medium text-ink after:absolute after:-inset-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            +{hidden} more
          </button>
        </li>
      )}
    </ul>
  );
}

export function PromptCard({ prompt, showDay = false }: { prompt: Prompt; showDay?: boolean }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Only offer "Show full prompt" when the clamp actually hides something.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, prompt.text]);

  return (
    <li id={`prompt-${prompt.n}`} className="relative scroll-mt-6 pl-9 md:pl-12">
      <span aria-hidden="true" className="absolute top-7 left-3 size-3 -translate-x-1/2 rounded-full bg-accent ring-4 ring-canvas md:left-4" />
      <article aria-label={`Prompt ${prompt.n}`} className="rounded-xl border border-line bg-surface p-5 md:p-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted tabular-nums">
          <span className="rounded-full bg-accent-soft px-2.5 font-semibold text-accent">#{prompt.n}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={prompt.at}>{showDay ? `${formatDay(prompt.at)} ${formatClock(prompt.at)}` : formatClock(prompt.at)}</time>
          <span aria-hidden="true">·</span>
          <span>{plural(prompt.words, "word")}</span>
          {prompt.commitSha === null && (
            <>
              <span aria-hidden="true">·</span>
              <span>not committed</span>
            </>
          )}
        </p>

        <blockquote className="mt-3 flex gap-2">
          <span aria-hidden="true" className="-mt-1 text-[28px] leading-9 font-semibold text-accent select-none">
            “
          </span>
          <p
            ref={textRef}
            className={
              expanded
                ? "min-w-0 text-[17px] leading-relaxed whitespace-pre-wrap text-ink wrap-break-word md:text-lg"
                : "line-clamp-6 min-w-0 text-[17px] leading-relaxed whitespace-pre-wrap text-ink wrap-break-word md:text-lg"
            }
          >
            <PromptText text={prompt.text} />
          </p>
        </blockquote>

        {(overflows || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="relative mt-2 ml-5 text-sm font-medium text-accent after:absolute after:-inset-3 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {expanded ? "Show less" : "Show full prompt"}
          </button>
        )}

        {prompt.files.length > 0 && <FileChips files={prompt.files} />}
      </article>
    </li>
  );
}
