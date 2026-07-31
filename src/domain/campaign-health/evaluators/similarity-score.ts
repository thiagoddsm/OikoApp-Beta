/**
 * Motor de Cálculo de Similaridade de Texto
 * Retorna uma pontuação de 0 a 100%, onde:
 * - 100% significa textos idênticos
 * - 0% significa textos completamente distintos
 */
export function calculateSimilarityScore(texts: string[]): number {
  if (!texts || texts.length <= 1) return 100;

  const validTexts = texts.filter(t => t && t.trim().length > 0);
  if (validTexts.length <= 1) return 100;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < validTexts.length; i++) {
    for (let j = i + 1; j < validTexts.length; j++) {
      totalSimilarity += jaccardSimilarity(validTexts[i], validTexts[j]);
      comparisons++;
    }
  }

  if (comparisons === 0) return 100;
  const avg = Math.round((totalSimilarity / comparisons) * 100);
  return Math.min(100, Math.max(0, avg));
}

function jaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(tokenize(textA));
  const wordsB = new Set(tokenize(textB));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach(w => {
    if (wordsB.has(w)) intersection++;
  });

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}
