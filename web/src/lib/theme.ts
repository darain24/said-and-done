// Theme choice (FR-45, DESIGN §4.8). index.html applies the saved choice
// before first paint; this keeps it in sync after that.
export type ThemeChoice = "system" | "light" | "dark";

const KEY = "said-theme";
export const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/** Storage can be blocked; the choice then lasts for this visit only. */
export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Not remembered, but still applied.
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const dark = choice === "dark" || (choice === "system" && darkQuery().matches);
  document.documentElement.classList.toggle("dark", dark);
}
