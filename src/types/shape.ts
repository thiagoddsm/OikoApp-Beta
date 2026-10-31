import { SHAPE_DATA } from '@/lib/shape-complete-data';
import {
  calculateDisc,
  DISC_TOTAL,
  type DiscLetter,
  type DiscScores,
  type DiscStrength,
} from '@/lib/disc';

export interface ShapeTop3Item {
  id: string;
  nome: string;
  name?: string;
  score: number;
  desc?: string;
}

export interface ShapeAiAnalysis {
  resumoServidor: string;
  areasRecomendadas: string[];
  alertas: string[];
  proximosPassos: string[];
  /** Novos campos (DISC) */
  comoComunicar?: string[];
  comoGerenciar?: string[];
  evitar?: string[];
  generatedAt: string; // ISO string após sanitize
}

export interface ShapeResult {
  id: string;
  userId: string | null;
  nome: string;
  email: string;
  telefone?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  gcId?: string;
  gcInfo?: string;
  formacao?: string;
  profissao?: string;
  ministryTarget?: string;
  habilidades: string[];
  disponibilidade?: string[];
  coracao: Record<string, string>;
  /** LEGADO: escalas O/E (14 itens). Somente leitura para registros antigos. */
  perso: Record<string, number>;
  dom: Record<string, number>;
  /** LEGADO: quadrante antigo (ou rótulo derivado do DISC) */
  quadrante: string;
  orgScore: number;
  motScore: number;
  domScores: Record<string, number>;
  top3: ShapeTop3Item[];
  experiencias?: Record<string, string>;
  status?: 'in_progress' | 'completed';
  currentStep?: number;
  completionPercentage?: number;
  /** DISC */
  discAnswers?: Record<string, DiscLetter>;
  discScores?: DiscScores;
  discPrimary?: DiscLetter | null;
  discSecondary?: DiscLetter | null;
  discProfile?: string;
  discTie?: boolean;
  discStrength?: DiscStrength | null;
  discAnsweredCount?: number;
  discVersion?: number;
  createdAt: string; // ISO string após sanitize
  updatedAt?: string;
  aiAnalysis?: ShapeAiAnalysis | null;
}

/** Respostas de dons válidas = chaves D001..D133 (ignora chaves antigas de score por domínio) */
export function countGiftAnswers(dom?: Record<string, number>): number {
  return Object.keys(dom || {}).filter((k) => /^D\d{3}$/.test(k)).length;
}

export function calculateShapeCompletion(data: {
  coracao?: Record<string, string>;
  dom?: Record<string, number>;
  perso?: Record<string, number>;
  discAnswers?: Record<string, string>;
  habilidades?: string[];
  disponibilidade?: string[];
  experiencias?: Record<string, string>;
  status?: string;
}) {
  const heartAnswered = Object.values(data.coracao || {}).filter(
    (v) => typeof v === 'string' && v.trim().length > 0
  ).length;
  const giftsAnswered = countGiftAnswers(data.dom);
  const discAnswered = Object.keys(calculateDisc(data.discAnswers).discAnswers).length;
  const legacyPersoAnswered = Object.keys(data.perso || {}).length;
  const legacyPersoDone = legacyPersoAnswered >= 14;
  const abilitiesCount = (data.habilidades || []).length;
  const hasAvailOrExp =
    (data.disponibilidade && data.disponibilidade.length > 0) ||
    Object.values(data.experiencias || {}).some((v) => typeof v === 'string' && v.trim().length > 0);

  // Pesos: Coração (15%) + Dons (55%) = 70% na Aula 1
  // DISC (15%) + Habilidades/Disponibilidade (15%) = 30% na Aula 2
  const heartScore = Math.min(heartAnswered / 5, 1) * 15;
  const giftsScore = Math.min(giftsAnswered / 133, 1) * 55;
  const persoScore =
    Math.max(Math.min(discAnswered / DISC_TOTAL, 1), legacyPersoDone ? 1 : 0) * 15;
  const abilitiesScore = (abilitiesCount > 0 ? 10 : 0) + (hasAvailOrExp ? 5 : 0);

  const rawPercent = Math.round(heartScore + giftsScore + persoScore + abilitiesScore);
  const percentage = data.status === 'completed' ? 100 : Math.min(rawPercent, 99);

  const discDone = discAnswered >= DISC_TOTAL;
  const persoDone = discDone || legacyPersoDone;

  return {
    percentage,
    heartAnswered,
    heartTotal: 5,
    heartDone: heartAnswered >= 5,
    giftsAnswered,
    giftsTotal: 133,
    giftsDone: giftsAnswered >= 133,
    discAnswered,
    discTotal: DISC_TOTAL,
    discDone,
    legacyPersoDone,
    /** pilar P concluído (DISC ou legado) */
    persoAnswered: discDone ? discAnswered : legacyPersoAnswered,
    persoTotal: discDone || !legacyPersoDone ? DISC_TOTAL : 14,
    persoDone,
    abilitiesCount,
    abilitiesDone: abilitiesCount > 0,
    aula1Completed: giftsAnswered >= 133,
    aula2Completed: data.status === 'completed' || (persoDone && abilitiesCount > 0),
  };
}

/**
 * Métricas de personalidade + dons.
 *  - Se houver respostas DISC → usa DISC (e deriva o quadrante a partir do perfil primário).
 *  - Caso contrário, mantém o cálculo LEGADO (escalas O/E) somente se houver respostas legadas.
 */
export function calculateShapeMetrics(
  personality: Record<string, number> = {},
  gifts: Record<string, number> = {},
  discAnswersRaw?: Record<string, string>
) {
  const disc = calculateDisc(discAnswersRaw);

  let orgScore: number | null = null;
  let motScore: number | null = null;
  let quadrante: string | null = disc.quadrante;

  if (disc.discAnsweredCount === 0 && Object.keys(personality).length > 0) {
    let orgSum = 0;
    let motSum = 0;
    SHAPE_DATA.personality.eixo_org.items.forEach((item) => {
      orgSum += personality[item.id] !== undefined ? personality[item.id] : 3;
    });
    SHAPE_DATA.personality.eixo_mot.items.forEach((item) => {
      motSum += personality[item.id] !== undefined ? personality[item.id] : 3;
    });
    orgScore = Number((orgSum / SHAPE_DATA.personality.eixo_org.items.length).toFixed(2));
    motScore = Number((motSum / SHAPE_DATA.personality.eixo_mot.items.length).toFixed(2));
    quadrante = `${motScore >= 3.0 ? 'Pessoas' : 'Tarefas'} / ${orgScore >= 3.0 ? 'Formal' : 'Informal'}`;
  }

  const domScores: Record<string, number> = {};
  SHAPE_DATA.gifts.forEach((g) => {
    domScores[g.id] = 0;
  });
  SHAPE_DATA.giftQuestions.forEach((q) => {
    const val = gifts[q.id];
    if (val !== undefined) {
      domScores[q.domId] = (domScores[q.domId] || 0) + val;
    }
  });

  const sortedGifts = SHAPE_DATA.gifts
    .map((g) => ({
      id: g.id,
      nome: g.name,
      name: g.name,
      score: domScores[g.id] || 0,
      desc: g.desc,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    disc,
    orgScore,
    motScore,
    quadrante,
    domScores,
    top3: sortedGifts.slice(0, 3),
  };
}

export type ShapeQuadrante = 'Tarefas / Formal' | 'Tarefas / Informal' | 'Pessoas / Formal' | 'Pessoas / Informal';

export const QUADRANTE_META: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  'Tarefas / Formal': { label: 'Tarefas / Formal', emoji: '🎯', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'Tarefas / Informal': { label: 'Tarefas / Informal', emoji: '⚡', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Pessoas / Formal': { label: 'Pessoas / Formal', emoji: '❤️', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  'Pessoas / Informal': { label: 'Pessoas / Informal', emoji: '🤝', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

export const HABILIDADES_MAP: Record<string, { nome: string; icon: string }> = {
  s1: { nome: 'Construção Civil', icon: '🛠️' },
  s2: { nome: 'Tecnologia / TI', icon: '💻' },
  s3: { nome: 'Áudio e Vídeo', icon: '🎬' },
  s4: { nome: 'Design Gráfico', icon: '🎨' },
  s5: { nome: 'Contabilidade / Finanças', icon: '📊' },
  s6: { nome: 'Direito / Jurídico', icon: '⚖️' },
  s7: { nome: 'Saúde / Psicologia', icon: '🩺' },
  s8: { nome: 'Educação / Pedagogia', icon: '🎓' },
  s9: { nome: 'Culinária', icon: '🍳' },
  s10: { nome: 'Costura / Artesanato', icon: '🧵' },
  s11: { nome: 'Música / Instrumentos', icon: '🎵' },
  s12: { nome: 'Gestão / Administração', icon: '🗂️' },
  s13: { nome: 'Marketing / Redes Sociais', icon: '📱' },
  s14: { nome: 'Programação / Dev', icon: '⌨️' },
  s15: { nome: 'Edição de Vídeo', icon: '🎞️' },
  s16: { nome: 'Fotografia / Edição de Foto', icon: '📷' },
  s17: { nome: 'Criação de Cenários', icon: '🎭' },
  s18: { nome: 'Organização de Eventos', icon: '📅' },
  s19: { nome: 'Organização de Festas', icon: '🎈' },
  s20: { nome: 'Pintura / Artes', icon: '🖌️' },
  s21: { nome: 'Planilhas / Excel', icon: '📝' },
  s22: { nome: 'Manutenção / Elétrica', icon: '⚡' },
  s23: { nome: 'Redação / Copywriting', icon: '✍️' },
  s24: { nome: 'Transmissão / Streaming', icon: '🎥' },
  s25: { nome: 'Logística / Transporte', icon: '🚚' },
  s26: { nome: 'Mentoria / Aconselhamento', icon: '🤝' },
  s27: { nome: 'Atendimento / Recepção', icon: '👋' },
  s28: { nome: 'Tradução / Idiomas', icon: '🗣️' },
  s29: { nome: 'Operação de Áudio', icon: '🎧' },
  s30: { nome: 'Dança / Teatro', icon: '🩰' },
};
