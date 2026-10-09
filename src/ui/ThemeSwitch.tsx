import type { Theme } from './theme';

// Text-only theme switch: two words, the active one ruled underneath. Shared by
// landing, login and /app so the control reads the same everywhere. Styling is
// .g-theme in gloss.css, so it needs a .v-gloss ancestor.
export function ThemeSwitch({ theme, toggle }: { theme: Theme; toggle: () => void }) {
  return (
    <div role="group" aria-label="Colour theme" className="g-theme g-mono flex items-center gap-2.5 text-[13px]">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={theme === t}
          onClick={() => theme !== t && toggle()}
          className="capitalize"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
