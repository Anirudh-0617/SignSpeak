import { useLayoutEffect, useRef } from 'react';

// Mode tabs on the header rule. The ink bar under the active tab slides to the
// next one, so a switch reads as a move along the bar, not a page swap. Tab
// widths differ, so the bar's offset/width are measured and handed to CSS as
// --tab-x / --tab-w (see .g-tabs-ink); the transition itself is pure CSS.
export function ModeTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className = '',
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const place = () => {
      const tab = root.querySelector<HTMLElement>(`[data-tab="${value}"]`);
      if (!tab) return;
      root.style.setProperty('--tab-x', `${tab.offsetLeft}px`);
      root.style.setProperty('--tab-w', String(tab.offsetWidth));
    };
    place();
    // Fonts landing or a breakpoint change the label widths after first paint.
    const ro = new ResizeObserver(place);
    ro.observe(root);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={label}
      className={`g-tabs flex items-stretch gap-5 sm:gap-7 ${className}`}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const i = tabs.findIndex((t) => t.id === value);
        const step = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
        const next = tabs[(i + step) % tabs.length].id;
        onChange(next);
        e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          data-tab={t.id}
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className="g-gloss text-[12px]"
        >
          {t.label}
        </button>
      ))}
      <span aria-hidden="true" className="g-tabs-ink" />
    </div>
  );
}
