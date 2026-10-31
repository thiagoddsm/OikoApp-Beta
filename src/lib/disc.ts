import { DISC_QUESTIONS, DISC_VERSION, type DiscLetter } from './disc-questions';

export type { DiscLetter };
export { DISC_VERSION };

export const DISC_LETTERS: DiscLetter[] = ['D', 'I', 'S', 'C'];
export const DISC_TOTAL = DISC_QUESTIONS.length;

/** Pesos por posição no ranking de cada questão: 1º (4pts), 2º (3pts), 3º (2pts), 4º (1pt) */
export const DISC_RANK_POINTS = [4, 3, 2, 1] as const;
/** Total máximo de pontos no inventário (12 perguntas x 10 pontos) */
export const DISC_TOTAL_POINTS = DISC_TOTAL * 10; // 120 pontos

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
  discAnswers: Record<string, DiscLetter[]>;
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

/** Garante que uma lista de letras contenha as 4 dimensões D, I, S, C sem repetições */
export function normalizeDiscOrder(letters: unknown): DiscLetter[] {
  const result: DiscLetter[] = [];
  const seen = new Set<DiscLetter>();

  if (Array.isArray(letters)) {
    for (const item of letters) {
      if ((item === 'D' || item === 'I' || item === 'S' || item === 'C') && !seen.has(item)) {
        result.push(item);
        seen.add(item);
      }
    }
  } else if (typeof letters === 'string' && (letters === 'D' || letters === 'I' || letters === 'S' || letters === 'C')) {
    result.push(letters);
    seen.add(letters);
  }

  // Completa as que faltarem com as outras dimensões
  for (const l of DISC_LETTERS) {
    if (!seen.has(l)) {
      result.push(l);
      seen.add(l);
    }
  }

  return result.slice(0, 4);
}

/** Mantém somente respostas de perguntas e rankings de letras válidos */
export function sanitizeDiscAnswers(raw: unknown): Record<string, DiscLetter[]> {
  const out: Record<string, DiscLetter[]> = {};
  if (!raw || typeof raw !== 'object') return out;
  const ids = new Set(DISC_QUESTIONS.map((q) => q.id));

  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ids.has(k) || !v) continue;
    out[k] = normalizeDiscOrder(v);
  }

  return out;
}

/**
 * Cálculo por ordenação de prioridades (pesos 4, 3, 2, 1):
 *  1) soma ponderada das 12 perguntas (total de 120 pontos);
 *  2) desempate: soma ponderada no bloco "sob pressão" (Q10–Q12);
 *  3) último recurso: ordem fixa D > I > S > C (marca discTie).
 */
export function calculateDisc(rawAnswers: unknown): DiscResult {
  const discAnswers = sanitizeDiscAnswers(rawAnswers);
  const scores: DiscScores = { D: 0, I: 0, S: 0, C: 0 };
  const pressure: DiscScores = { D: 0, I: 0, S: 0, C: 0 };

  for (const q of DISC_QUESTIONS) {
    const ranking = discAnswers[q.id];
    if (!ranking || ranking.length < 4) continue;

    ranking.forEach((letter, idx) => {
      const pts = DISC_RANK_POINTS[idx] ?? 0;
      scores[letter] += pts;
      if (q.tiebreaker) {
        pressure[letter] += pts;
      }
    });
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
  // No sistema de 120 pontos (média 30 por dimensão), gap >= 8 é muito marcado e gap <= 2 é combinado
  const strength: DiscStrength = gap >= 8 ? 'marked' : gap <= 2 ? 'blended' : 'defined';

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
