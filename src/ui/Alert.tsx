// Inline alert: a ruled left edge carries the tone, the text stays ink so it
// reads at body contrast. Optional single action.
export function Alert({
  variant = 'error',
  title,
  body,
  action,
}: {
  variant?: 'error' | 'warn';
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}) {
  const edge = variant === 'error' ? 'border-danger' : 'border-ink-3';
  const head = variant === 'error' ? 'text-danger' : 'text-ink';
  return (
    <div role="alert" className={`border-l-2 ${edge} pl-3 py-1 text-sm grid gap-1`}>
      <div className={`font-medium ${head}`}>{title}</div>
      {body && <div className="text-xs text-ink-2">{body}</div>}
      {action && (
        <button type="button" onClick={action.onClick} className="g-link justify-self-start text-xs mt-0.5">
          {action.label}
        </button>
      )}
    </div>
  );
}
