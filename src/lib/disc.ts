import { DISC_QUESTIONS, DISC_VERSION, type DiscLetter } from './disc-questions';

export type { DiscLetter };
export { DISC_VERSION };

export const DISC_LETTERS: DiscLetter[] = ['D', 'I', 'S', 'C'];
export const DISC_TOTAL = DISC_QUESTIONS.length;

export type DiscScores = Record<DiscLetter, number>;
export type DiscStrength = 'marked' | 'defined' | 'blended';

/** Rótulo de transição para o formato legado (4 quadrantes) */
export const QUADRANT_BY_DISC: Record<DiscLetter, string> = {
  D: 'Tarefas / Informal',
  I: 'Pessoas / Informal',
  S: 'Pessoas / Formal',
  C: 'Tarefas / Formal',
};

export interface DiscResult {
  discAnswers: Record<string, DiscLetter>;
  discScores: DiscScores;
  discAnsweredCount: number;
  discComplete: boolean;
  /** Só é definido com 12/12 respondidas */
  discPrimary: DiscLetter | null;
  discSecondary: DiscLetter | null;
  /** ex.: "DI" */
  discProfile: string;
  /** true se a ordem de primário/secundário foi decidida apenas pela ordem fixa */
  discTie: boolean;
  discStrength: DiscStrength | null;
  quadrante: string | null;
}

/** Mantém somente respostas de perguntas e letras válidas */
export function sanitizeDiscAnswers(raw: unknown): Record<string, DiscLetter> {
  const out: Record<string, DiscLetter> = {};
  if (!raw || typeof raw !== 'object') return out;
  const ids = new Set(DISC_QUESTIONS.map((q) => q.id));
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ids.has(k) && (v === 'D' || v === 'I' || v === 'S' || v === 'C')) out[k] = v;
  }
  return out;
}

/**
 * Regras:
 *  1) maior pontuação;
 *  2) desempate: maior pontuação no bloco "sob pressão" (Q10–Q12);
 *  3) último recurso: ordem fixa D > I > S > C (apenas para ser determinístico; marca discTie).
 */
export function calculateDisc(rawAnswers: unknown): DiscResult {
  const discAnswers = sanitizeDiscAnswers(rawAnswers);
  const scores: DiscScores = { D: 0, I: 0, S: 0, C: 0 };
  const pressure: DiscScores = { D: 0, I: 0, S: 0, C: 0 };

  for (const q of DISC_QUESTIONS) {
    const l = discAnswers[q.id];
    if (!l) continue;
    scores[l]++;
    if (q.tiebreaker) pressure[l]++;
  }

  const count = Object.keys(discAnswers).length;
  const complete = count >= DISC_TOTAL;

  const base: DiscResult = {
    discAnswers,
    discScores: scores,
    discAnsweredCount: count,
    discComplete: complete,
    discPrimary: null,
    discSecondary: null,
    discProfile: '',
    discTie: false,
    discStrength: null,
    quadrante: null,
  };
  if (!complete) return base;

  const ranked = [...DISC_LETTERS].sort(
    (a, b) =>
      scores[b] - scores[a] ||
      pressure[b] - pressure[a] ||
      DISC_LETTERS.indexOf(a) - DISC_LETTERS.indexOf(b)
  );

  const [p, s, t] = ranked;
  const sameRank = (x: DiscLetter, y: DiscLetter) =>
    scores[x] === scores[y] && pressure[x] === pressure[y];

  const secondary = scores[s] > 0 ? s : null;
  const tie = sameRank(p, s) || (secondary !== null && sameRank(s, t));

  const gap = scores[p] - scores[s];
  const strength: DiscStrength = gap >= 5 ? 'marked' : gap <= 1 ? 'blended' : 'defined';

  return {
    ...base,
    discPrimary: p,
    discSecondary: secondary,
    discProfile: p + (secondary ?? ''),
    discTie: tie,
    discStrength: strength,
    quadrante: QUADRANT_BY_DISC[p],
  };
}

export const DISC_STRENGTH_LABEL: Record<DiscStrength, string> = {
  marked: 'Perfil muito marcado',
  defined: 'Perfil definido',
  blended: 'Perfil combinado',
};
