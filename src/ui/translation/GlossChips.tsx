import { memo } from 'react';
import { useStore } from '../../state/store';

function GlossChipsImpl() {
  const glossStream = useStore((s) => s.glossStream);
  const removeGloss = useStore((s) => s.removeGloss);

  if (glossStream.length === 0) return null;

  // The gloss line: what the classifier actually committed, with its
  // confidence, so a wrong word can be struck without editing the text.
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Committed signs. Remove any that are wrong.">
      {glossStream.map((g) => (
        <li key={g.id} className="inline-flex items-baseline gap-1.5 g-mono text-xs">
          <span className="text-ink-2">{g.label}</span>
          <span className="text-[10px] text-ink-3">{g.confidence.toFixed(2)}</span>
          <button
            type="button"
            onClick={() => removeGloss(g.id)}
            className="g-quiet px-0.5 hover:!text-danger"
            aria-label={`Remove ${g.label}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

export const GlossChips = memo(GlossChipsImpl);
