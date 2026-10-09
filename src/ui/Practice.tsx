import { memo } from 'react';
import { LessonPicker } from './practice/LessonPicker';
import { PracticeSession } from './practice/PracticeSession';
import { usePracticeStore } from '../state/practiceStore';

function PracticeImpl() {
  const currentSign = usePracticeStore((s) => s.currentSign);

  return (
    <section className="w-full" aria-label="Practice mode">
      {currentSign ? <PracticeSession /> : <LessonPicker />}
    </section>
  );
}

export const Practice = memo(PracticeImpl);
