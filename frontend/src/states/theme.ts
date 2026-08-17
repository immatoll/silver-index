/**
 * Dev/debug-only theme toggle — mirrors silver-link's own
 * (`silver-link/app/src/states/theme.ts`): a plain module backed by
 * `localStorage`, applying `data-theme="light"` directly to `<html>`
 * rather than going through React state/context, so it can be applied
 * synchronously on boot (see main.tsx) before the first paint. Dark is
 * the implicit default — no stored value means dark, not a third
 * "system" state.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "silver-index:theme";

export function getTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
}

export function applyStoredTheme() {
  applyTheme(getTheme());
}

export function toggleTheme(): Theme {
  const next = getTheme() === "light" ? "dark" : "light";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  return next;
}
