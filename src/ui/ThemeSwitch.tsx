import type { Theme } from './theme';

// Text-only theme switch: two words, the active one ruled underneath. Shared by
// landing, login and /app so the control reads the same everywhere. Styling is
// .g-theme in gloss.css, so it needs a .v-gloss ancestor.
// `compact` (phone header): one button naming the theme you'd switch to, so
// the logo and every control fit on a single row at 360 px.
export function ThemeSwitch({
  theme,
  toggle,
  compact = false,
}: {
  theme: Theme;
  toggle: () => void;
  compact?: boolean;
}) {
  if (compact) {
    const next = theme === 'light' ? 'dark' : 'light';
    return (
      <button type="button" onClick={toggle} className="g-quiet g-mono capitalize" aria-label={`Switch to ${next} theme`}>
        {next}
      </button>
    );
  }
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
