// ReplayBar (FR-47, DESIGN §4.7, §6): play/pause, progress, position, speed and exit.
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { formatCount } from "../lib/format";
import { SPEEDS, type Speed } from "../lib/replay";
import type { Replay } from "../lib/useReplay";
import { PauseIcon, PlayIcon, RestartIcon } from "./icons";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const SPEED_OPTION = {
  on: "h-full rounded px-3 text-sm font-semibold tabular-nums bg-accent-soft text-accent",
  off: "h-full rounded px-3 text-sm font-medium tabular-nums text-muted hover:text-ink",
} as const;

function Progress({ cursor, total, seek }: Pick<Replay, "cursor" | "total" | "seek">) {
  const percent = total === 0 ? 0 : (cursor / total) * 100;

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek(Math.round(((e.clientX - rect.left) / rect.width) * total));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: cursor - 1,
      ArrowDown: cursor - 1,
      ArrowRight: cursor + 1,
      ArrowUp: cursor + 1,
      PageDown: cursor - 10,
      PageUp: cursor + 10,
      Home: 0,
      End: total,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    seek(moves[e.key]!);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Replay position"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={cursor}
      aria-valuetext={`Prompt ${cursor} of ${total}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`order-last flex h-8 basis-full cursor-pointer items-center rounded-md md:order-none md:h-11 md:flex-1 md:basis-auto ${FOCUS}`}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ReplayBar({ replay }: { replay: Replay }) {
  const { cursor, total, playing, finished, speed, toggle, seek, setSpeed, exit } = replay;
  const playRef = useRef<HTMLButtonElement>(null);

  // Keyboard users land on play/pause, so Space works straight away.
  useEffect(() => playRef.current?.focus({ preventScroll: true }), []);

  return (
    <div
      role="region"
      aria-label="Replay controls"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 shadow-sm backdrop-blur transition-[translate] duration-300 ease-out motion-safe:starting:translate-y-full"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 md:flex-nowrap md:gap-4 md:px-6 md:py-3">
        <button
          ref={playRef}
          type="button"
          onClick={toggle}
          aria-label={finished ? "Replay again" : playing ? "Pause" : "Play"}
          className={
            finished
              ? `inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-accent px-4 font-medium text-white dark:text-canvas ${FOCUS}`
              : `inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-white dark:text-canvas ${FOCUS}`
          }
        >
          {finished ? (
            <>
              <RestartIcon />
              <span>Replay again</span>
            </>
          ) : playing ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>

        <Progress cursor={cursor} total={total} seek={seek} />

        <p aria-live="polite" className="min-w-0 flex-1 text-sm font-medium whitespace-nowrap text-muted tabular-nums md:flex-none">
          {finished ? (
            "Replay finished"
          ) : (
            <>
              Prompt <span className="text-ink">{formatCount(cursor)}</span> of {formatCount(total)}
            </>
          )}
        </p>

        <div role="radiogroup" aria-label="Speed" className="hidden h-11 shrink-0 rounded-md border border-line p-0.5 md:flex">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === speed}
              onClick={() => setSpeed(s)}
              className={`${s === speed ? SPEED_OPTION.on : SPEED_OPTION.off} ${FOCUS}`}
            >
              {s}×
            </button>
          ))}
        </div>
        <select
          aria-label="Speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value) as Speed)}
          className={`h-11 shrink-0 rounded-md border border-line bg-surface px-2 text-sm font-medium text-ink tabular-nums md:hidden ${FOCUS}`}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>

        <button type="button" onClick={exit} className={`h-11 shrink-0 rounded-md px-3 text-sm font-medium text-ink hover:bg-sunken ${FOCUS}`}>
          Exit
        </button>
      </div>
    </div>
  );
}
