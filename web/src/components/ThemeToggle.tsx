// ThemeToggle (DESIGN §4.8): cycles System → Light → Dark.
import { useEffect, useState } from "react";
import { applyTheme, darkQuery, readThemeChoice, saveThemeChoice, type ThemeChoice } from "../lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };

const LABEL: Record<ThemeChoice, string> = {
  system: "Theme: system. Switch to light",
  light: "Theme: light. Switch to dark",
  dark: "Theme: dark. Switch to system",
};

const ICON = { system: MonitorIcon, light: SunIcon, dark: MoonIcon } as const;

export function ThemeToggle() {
  const [choice, setChoice] = useState(readThemeChoice);

  useEffect(() => {
    applyTheme(choice);
    if (choice !== "system") return;
    const query = darkQuery();
    const follow = () => applyTheme("system");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [choice]);

  const Icon = ICON[choice];
  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT[choice];
        saveThemeChoice(next);
        setChoice(next);
      }}
      aria-label={LABEL[choice]}
      title={LABEL[choice]}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Icon />
    </button>
  );
}
