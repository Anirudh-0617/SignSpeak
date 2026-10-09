export type Sign = {
  gloss: string;
  mode: 'fingerspell' | 'words';
  category: string;
  description: string;
  referenceUrl?: string;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ponytail: glosses must match public/models/words_asl/labels.json exactly.
// Conversational core sequenced to pair with Sentence Builder templates.
// Dropped from picker but kept in model + reference clips: HAPPY, SAD, TIRED,
// MOTHER, FRIEND, FAMILY, KISS, SLEEP, READ, BOOK, DOG, SCHOOL. Surface again
// via a "More signs" toggle only if judges/users pull for them.
const WORDS_BY_CATEGORY: Record<string, string[]> = {
  Greetings: ['HELLO', 'THANK-YOU', 'PLEASE', 'SORRY', 'YES', 'NO'],
  'Self & other': ['MY', 'NAME', 'YOU', 'MEET', 'NICE'],
  Actions: ['HELP', 'WANT', 'NEED', 'GO', 'KNOW', 'EAT', 'DRINK', 'LIKE'],
  Questions: ['WHAT'],
  Things: ['WATER'],
};

export const LESSONS: Sign[] = [
  ...ALPHABET.map<Sign>((g) => ({
    gloss: g,
    mode: 'fingerspell',
    category: 'Alphabet',
    description: `Fingerspell the letter ${g}.`,
  })),
  ...Object.entries(WORDS_BY_CATEGORY).flatMap(([category, glosses]) =>
    glosses.map<Sign>((g) => ({
      gloss: g,
      mode: 'words',
      category,
      description: `Sign ${g.toLowerCase().replace('-', ' ')}.`,
    })),
  ),
];
