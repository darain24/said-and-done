// useReplay (FR-47, DESIGN §6): cursor, playing, speed and the tick timer.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../../../src/story/model";
import { tickMs, type Speed } from "./replay";
import { useMediaQuery } from "./useMediaQuery";

const START_DELAY_MS = 400;
/** New cards land about 40% from the top of the screen. */
const SCROLL_FRACTION = 0.4;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export interface Replay {
  active: boolean;
  /** How many prompts are revealed (0 to total). */
  cursor: number;
  total: number;
  playing: boolean;
  finished: boolean;
  speed: Speed;
  start: () => void;
  exit: () => void;
  toggle: () => void;
  seek: (cursor: number) => void;
  setSpeed: (speed: Speed) => void;
}

function scrollToFraction(el: Element, smooth: boolean) {
  const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * SCROLL_FRACTION;
  window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "instant" });
}

/** Keys the focused element handles itself. */
function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("input, textarea, select, [role=slider]")) return true;
  return key === " " && target.closest("button, a") !== null;
}

export function useReplay(story: Story): Replay {
  const total = story.prompts.length;
  const [active, setActive] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const startTimer = useRef<number | undefined>(undefined);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const finished = active && cursor >= total;

  const cancelStart = () => window.clearTimeout(startTimer.current);

  const seek = useCallback(
    (next: number) => {
      cancelStart();
      setCursor(Math.min(total, Math.max(0, next)));
      if (next >= total) setPlaying(false);
    },
    [total],
  );

  const start = useCallback(() => {
    cancelStart();
    setActive(true);
    setCursor(0);
    setPlaying(false);
    startTimer.current = window.setTimeout(() => setPlaying(true), START_DELAY_MS);
  }, []);

  const exit = useCallback(() => {
    cancelStart();
    setActive(false);
    setPlaying(false);
    document.getElementById("replay-button")?.focus({ preventScroll: true });
  }, []);

  const toggle = useCallback(() => {
    cancelStart();
    if (cursor >= total) {
      setCursor(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [cursor, total]);

  // The tick: from prompt 0 the first card appears at once; after that each
  // card stays current for its tick length.
  useEffect(() => {
    if (!active || !playing || cursor >= total) return;
    const delay = cursor === 0 ? 0 : tickMs(story.prompts[cursor - 1]!.words, speed);
    const id = window.setTimeout(() => {
      setCursor(cursor + 1);
      if (cursor + 1 >= total) setPlaying(false);
    }, delay);
    return () => window.clearTimeout(id);
  }, [active, playing, cursor, speed, total, story]);

  // Follow the newest card (or the top of the timeline at prompt 0).
  useEffect(() => {
    if (!active) return;
    const n = cursor > 0 ? story.prompts[cursor - 1]?.n : undefined;
    const el = document.getElementById(n === undefined ? "timeline" : `prompt-${n}`);
    if (el) scrollToFraction(el, !reducedMotion);
  }, [active, cursor, story, reducedMotion]);

  // DESIGN §6.6: Space play/pause, ←/→ step, 1/2/4 speed, Esc exit.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || ownsKey(e.target, e.key)) return;
      const speeds: Record<string, Speed> = { "1": 1, "2": 2, "4": 4 };
      if (e.key === " ") toggle();
      else if (e.key === "ArrowLeft") seek(cursor - 1);
      else if (e.key === "ArrowRight") seek(cursor + 1);
      else if (e.key in speeds) setSpeed(speeds[e.key]!);
      else if (e.key === "Escape") exit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, cursor, toggle, seek, exit]);

  useEffect(() => cancelStart, []);

  return { active, cursor, total, playing, finished, speed, start, exit, toggle, seek, setSpeed };
}

/** DESIGN §4.1: numbers count up to a new value over 400 ms; they drop at once and jump under reduced motion. */
export function useCountUp(target: number): number {
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (reducedMotion || target <= from) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const startedAt = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - startedAt) / 400);
      const value = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      shownRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, reducedMotion]);

  return shown;
}
