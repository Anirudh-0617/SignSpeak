// Loading status; `label` doubles as the accessible status text.
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-xs text-ink-3">
      <span
        aria-hidden="true"
        className="size-3.5 animate-spin motion-reduce:animate-none rounded-full border-[1.5px] border-rule-strong border-t-ink"
      />
      {label}
    </span>
  );
}
