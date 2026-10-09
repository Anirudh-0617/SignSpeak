import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useInView } from './useInView';
import './landing.css';

// React wrappers for the transitions.dev recipes in landing.css, so pages use
// components instead of hand-toggling classes.

/** texts-reveal: children are .t-stagger-line--N spans; plays on mount or when
 *  scrolled into view (`onView`). */
export function Stagger({
  children,
  onView = false,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  onView?: boolean;
  className?: string;
  as?: 'div' | 'h1' | 'h2' | 'p';
}) {
  const { ref, inView } = useInView<HTMLElement>();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const shown = onView ? inView : mounted;
  return (
    <Tag
      ref={ref as never}
      className={'t-stagger ' + (shown ? 'is-shown ' : '') + className}
    >
      {children}
    </Tag>
  );
}

/** text-states-swap: blur-swaps whenever `text` changes. `live` announces
 *  changes to screen readers; leave it off for anything that auto-cycles. */
export function SwapText({
  text,
  className = '',
  live = false,
}: {
  text: string;
  className?: string;
  live?: boolean;
}) {
  const [shown, setShown] = useState(text);
  const [phase, setPhase] = useState<'' | 'is-exit' | 'is-enter-start'>('');
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (text === shown) return;
    setPhase('is-exit');
    const t = window.setTimeout(() => {
      setShown(text);
      setPhase('is-enter-start');
      requestAnimationFrame(() => {
        void ref.current?.offsetHeight;
        setPhase('');
      });
    }, 150);
    return () => window.clearTimeout(t);
  }, [text, shown]);

  return (
    <span
      ref={ref}
      className={`t-text-swap ${phase} ${className}`}
      aria-live={live ? 'polite' : undefined}
    >
      {shown}
    </span>
  );
}

/** number-pop-in: digits pop in when scrolled into view. */
export function PopNumber({ value, className = '' }: { value: string; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const chars = value.split('');
  return (
    <span
      ref={ref}
      className={'t-digit-group ' + (inView ? 'is-animating ' : '') + className}
      aria-label={value}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="t-digit"
          data-stagger={
            i === chars.length - 2 ? '1' : i === chars.length - 1 ? '2' : undefined
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/** learn-more-hover chevron. Put inside an element with class `t-learn`. */
export function Chevron({ className = '' }: { className?: string }) {
  return (
    <span className={'t-learn-chevron ' + className} aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path className="t-learn-arm t-learn-arm-top" d="M6 4L10 8" />
        <path className="t-learn-arm t-learn-arm-bot" d="M10 8L6 12" />
      </svg>
    </span>
  );
}

/** Scroll reveal wrapper. Give children style={{ '--i': n }} to stagger. */
export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'ol';
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag ref={ref as never} className={'reveal ' + (inView ? 'is-in ' : '') + className}>
      {children}
    </Tag>
  );
}
