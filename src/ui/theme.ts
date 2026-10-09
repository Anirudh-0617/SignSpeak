import { useEffect, useState } from 'react';

// ponytail: one theme for the whole product. Sets `data-theme` on <html>,
// which flips the --g-* tokens in index.css for landing, login and /app alike.
// Not cleared on unmount — the point is
// that it survives navigation between landing, login and app.
const KEY = 'signspeak.theme';

export type Theme = 'light' | 'dark';

function preferred(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // No explicit choice yet — follow the OS rather than guessing.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Called from main.tsx before React mounts, so the first paint is already the
// right theme. Without this the page renders dark then snaps to light.
export function initTheme(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = preferred();
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(preferred);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(KEY, theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))];
}
