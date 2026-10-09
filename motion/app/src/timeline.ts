// The edit: which plate plays when. A voiceover has no beat grid, so every cut sits in the pause
// before a line: just before its first word (never after it), anchored to the aligned script
// (data/lyrics.json).
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut in the pause before the line containing q: 0.18 s before its first word (less if the pause is short). */
  const cut = (q: string, nth = 0) => {
    const l = ly.get(q, nth);
    const prev = ly.lines[l.i - 1];
    const gap = prev ? l.start - prev.end : 1;
    return l.start - Math.min(0.18, Math.max(0.04, gap * 0.45));
  };
  const b = {
    reads: cut('SignSpeak reads'),
    landmarks: cut('The camera finds'),
    classify: cut('A small neural'),
    transcript: cut('Letters become'),
    translate: cut('Press Translate'),
    practice: cut('Still learning'),
    honest: cut('Fingerspelling scores'),
    outro: cut('Your camera feed'),
    end: au.duration,
  };
  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });
  return [
    E('hook', 'ss_hook', 0, b.reads),
    E('reads', 'ss_reads', b.reads, b.landmarks),
    E('landmarks', 'ss_landmarks', b.landmarks, b.classify),
    E('classify', 'ss_classify', b.classify, b.transcript),
    E('transcript', 'ss_transcript', b.transcript, b.translate),
    E('translate', 'ss_translate', b.translate, b.practice),
    E('practice', 'ss_practice', b.practice, b.honest),
    E('honest', 'ss_honest', b.honest, b.outro),
    E('outro', 'ss_outro', b.outro, b.end),
  ];
}
