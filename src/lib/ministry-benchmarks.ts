import type { DiscLetter, DiscScores } from './disc';
import type { MinistryProfile } from '@/types/shape';

export interface MinistryBenchmark {
  id: string;
  name: string;
  icon: string;
  category: 'criativo' | 'pastoral' | 'operacional' | 'ensino' | 'estrategico';
  description: string;
  /** Curva Comportamental Ideal (soma = 120 pontos) */
  idealDisc: DiscScores;
  /** Dons essenciais e complementares mais afins com esta área */
  primaryGifts: string[]; // nomes ou IDs em minúsculas normalizadas
  secondaryGifts: string[];
}

export const MINISTRY_BENCHMARKS: MinistryBenchmark[] = [
  {
    id: 'midia',
    name: 'Mídia, Som & Transmissão',
    icon: '🎬',
    category: 'operacional',
    description: 'Operação técnica de áudio, iluminação, câmeras, corte de transmissão e projeção.',
    idealDisc: { D: 20, I: 20, S: 35, C: 45 },
    primaryGifts: ['artesanato', 'serviço', 'comunicação criativa'],
    secondaryGifts: ['administração', 'conhecimento'],
  },
  {
    id: 'louvor',
    name: 'Louvor & Adoração',
    icon: '🎵',
    category: 'criativo',
    description: 'Vocal, instrumentistas, ensaios e condução da congregação no louvor congregacional.',
    idealDisc: { D: 25, I: 45, S: 35, C: 15 },
    primaryGifts: ['comunicação criativa', 'encorajamento'],
    secondaryGifts: ['serviço', 'fé', 'hospitalidade'],
  },
  {
    id: 'acolhimento',
    name: 'Acolhimento & Recepção',
    icon: '🤝',
    category: 'pastoral',
    description: 'Porta de entrada, recepção com sorriso, identificação de visitantes e integração inicial.',
    idealDisc: { D: 18, I: 47, S: 40, C: 15 },
    primaryGifts: ['hospitalidade', 'misericórdia', 'encorajamento'],
    secondaryGifts: ['evangelismo', 'serviço'],
  },
  {
    id: 'kids',
    name: 'Crianças (OikoKids)',
    icon: '🧸',
    category: 'pastoral',
    description: 'Cuidado, contação de histórias bíblicas, dinâmicas e segurança dos pequenos durante o culto.',
    idealDisc: { D: 18, I: 40, S: 47, C: 15 },
    primaryGifts: ['ensino', 'hospitalidade', 'misericórdia'],
    secondaryGifts: ['serviço', 'encorajamento', 'artesanato'],
  },
  {
    id: 'ensino',
    name: 'Ensino & Discipulado',
    icon: '📖',
    category: 'ensino',
    description: 'Classes de maturidade, discipulado um a um, preparação bíblica e treinamento de líderes.',
    idealDisc: { D: 25, I: 30, S: 25, C: 40 },
    primaryGifts: ['ensino', 'sabedoria', 'conhecimento'],
    secondaryGifts: ['pastorado', 'discernimento'],
  },
  {
    id: 'gc',
    name: 'Liderança de GC (Pequenos Grupos)',
    icon: '🔥',
    category: 'estrategico',
    description: 'Condução de reuniões nos lares, pastoreio de membros, formação de anfitriões e multiplicação.',
    idealDisc: { D: 38, I: 37, S: 27, C: 18 },
    primaryGifts: ['liderança', 'pastorado', 'discernimento'],
    secondaryGifts: ['fé', 'encorajamento', 'sabedoria'],
  },
  {
    id: 'social',
    name: 'Ação Social & Misericórdia',
    icon: '🥣',
    category: 'pastoral',
    description: 'Atendimento a famílias em vulnerabilidade, cestas básicas, projetos comunitários e apoio prático.',
    idealDisc: { D: 25, I: 25, S: 45, C: 25 },
    primaryGifts: ['misericórdia', 'serviço', 'contribuição'],
    secondaryGifts: ['hospitalidade', 'fé'],
  },
  {
    id: 'intercessao',
    name: 'Intercessão & Oração',
    icon: '🙏',
    category: 'pastoral',
    description: 'Vigílias, oração pelos pedidos da igreja, cobertura espiritual de cultos e discernimento.',
    idealDisc: { D: 15, I: 20, S: 50, C: 35 },
    primaryGifts: ['intercessão', 'fé', 'discernimento'],
    secondaryGifts: ['profecia', 'sabedoria', 'pastorado'],
  },
  {
    id: 'gestao',
    name: 'Gestão, Secretaria & Apoio Pastoral',
    icon: '📊',
    category: 'operacional',
    description: 'Organização de planilhas, cadastros, comunicação interna, finanças e logística da comunidade.',
    idealDisc: { D: 25, I: 15, S: 30, C: 50 },
    primaryGifts: ['administração', 'serviço', 'sabedoria'],
    secondaryGifts: ['conhecimento', 'discernimento'],
  },
];

export interface MinistryFitResult {
  benchmark: MinistryBenchmark;
  fitPercentage: number; // 0 a 100
  discFitPercentage: number; // 0 a 100
  giftsFitPercentage: number; // 0 a 100
  matchedGifts: string[];
  reasons: string[];
}

/** Normaliza string para comparação sem acentos */
function clean(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Motor Fuzzy de Aderência Vocacional (Lógica Simbólica):
 * Cruza o vetor de 120 pontos DISC do voluntário e seus Top 3 Dons com as curvas ideais dos ministérios.
 */
export function calculateMinistryFit(
  userDiscScores: DiscScores,
  topGifts: Array<{ id?: string; name?: string; nome?: string; score?: number }> = []
): MinistryFitResult[] {
  // Normaliza nomes dos top dons do aluno
  const userGiftNames = topGifts.map((g) => clean(g.nome || g.name || g.id || ''));

  const results: MinistryFitResult[] = MINISTRY_BENCHMARKS.map((bench) => {
    // 1. CÁLCULO DE FIT COMPORTAMENTAL (DISC)
    // Distância Manhattan ponderada entre a pontuação do aluno e a curva ideal do ministério
    const diffD = Math.abs((userDiscScores.D || 0) - bench.idealDisc.D);
    const diffI = Math.abs((userDiscScores.I || 0) - bench.idealDisc.I);
    const diffS = Math.abs((userDiscScores.S || 0) - bench.idealDisc.S);
    const diffC = Math.abs((userDiscScores.C || 0) - bench.idealDisc.C);
    const totalDist = diffD + diffI + diffS + diffC;

    // Normalização: distância máxima típica entre dois perfis balanceados de 120 pts é ~80-100 pts
    const discFit = Math.max(0, Math.min(100, Math.round((1 - totalDist / 90) * 100)));

    // 2. CÁLCULO DE FIT DE DONS ESPIRITUAIS
    let giftsScore = 0;
    const matchedGifts: string[] = [];
    const reasons: string[] = [];

    // Top 1 Dom (peso maior)
    const top1 = userGiftNames[0];
    if (top1 && bench.primaryGifts.some((g) => clean(g) === top1)) {
      giftsScore += 50;
      matchedGifts.push(topGifts[0]?.nome || topGifts[0]?.name || top1);
      reasons.push(`Dom dominante (${topGifts[0]?.nome || top1}) é essencial para esta área`);
    } else if (top1 && bench.secondaryGifts.some((g) => clean(g) === top1)) {
      giftsScore += 30;
      matchedGifts.push(topGifts[0]?.nome || topGifts[0]?.name || top1);
      reasons.push(`Dom dominante é complementar para esta área`);
    }

    // Top 2 e Top 3 Dons
    userGiftNames.slice(1, 3).forEach((giftName, idx) => {
      const realObj = topGifts[idx + 1];
      const displayName = realObj?.nome || realObj?.name || giftName;

      if (bench.primaryGifts.some((g) => clean(g) === giftName)) {
        giftsScore += 25;
        if (!matchedGifts.includes(displayName)) matchedGifts.push(displayName);
        reasons.push(`Dom de ${displayName} apoia as demandas centrais da equipe`);
      } else if (bench.secondaryGifts.some((g) => clean(g) === giftName)) {
        giftsScore += 15;
        if (!matchedGifts.includes(displayName)) matchedGifts.push(displayName);
      }
    });

    const giftsFit = Math.min(100, giftsScore);

    // 3. FIT TOTAL PONDERADO: 50% Comportamental (DISC) + 50% Dons Espirituais
    const overallFit = Math.round(discFit * 0.5 + giftsFit * 0.5);

    if (discFit >= 80) {
      reasons.push('Seu perfil comportamental natural se encaixa perfeitamente no ritmo desta equipe');
    }

    return {
      benchmark: bench,
      fitPercentage: overallFit,
      discFitPercentage: discFit,
      giftsFitPercentage: giftsFit,
      matchedGifts,
      reasons,
    };
  });

  // Ordena decrescente pelo Match Score Final
  return results.sort((a, b) => b.fitPercentage - a.fitPercentage);
}

export const DEFAULT_MINISTRY_PROFILES: MinistryProfile[] = [
  {
    id: 'louvor',
    nome: 'Louvor & Adoração',
    descricao: 'Condução congregacional da igreja no louvor e adoração através da música, arranjos e comunhão no altar.',
    expectativas: 'Pontualidade nos ensaios semanais, consagração espiritual, alinhamento pastoral e postura humilde de servo.',
    discRecomendado: ['I', 'S'],
    quadranteRecomendado: 'Pessoas / Informal',
    donsRecomendados: ['Comunicação Criativa', 'Encorajamento', 'Serviço', 'Fé'],
    habilidadesRecomendadas: 'Vocal/canto afinado, execução de instrumentos (teclado, violão, baixo, bateria), leitura de cifras.',
  },
  {
    id: 'ensino',
    nome: 'Ensino & Discipulado',
    descricao: 'Capacitação bíblica da membresia, classes do Molde de Servo, preparação para o batismo e acompanhamento um a um.',
    expectativas: 'Amor pelo estudo sistemático da Palavra, didática paciente, fidelidade doutrinária e discipulado intencional.',
    discRecomendado: ['C', 'I'],
    quadranteRecomendado: 'Tarefas / Formal',
    donsRecomendados: ['Ensino', 'Sabedoria', 'Conhecimento', 'Pastorado'],
    habilidadesRecomendadas: 'Didática, clareza na exposição bíblica, mentoria pessoal, organização de planos de aula.',
  },
  {
    id: 'kids',
    nome: 'Crianças (OikoKids)',
    descricao: 'Pastoreio infantil, ensino lúdico dos princípios de Jesus, recreação segura e cuidado dos filhos dos membros.',
    expectativas: 'Paciência, zelo irrestrito pela segurança física e emocional, dinamismo, amor pelas crianças e assiduidade na escala.',
    discRecomendado: ['S', 'I'],
    quadranteRecomendado: 'Pessoas / Formal',
    donsRecomendados: ['Hospitalidade', 'Misericórdia', 'Ensino', 'Encorajamento'],
    habilidadesRecomendadas: 'Recreação, contação de histórias, artesanato/desenho, paciência com diferentes faixas etárias.',
  },
  {
    id: 'acolhimento',
    nome: 'Acolhimento & Recepção',
    descricao: 'A primeira impressão da igreja: recepção na porta com carinho, orientação de lugares e entrega de boas-vindas.',
    expectativas: 'Chegada 30 min antes do culto, sorriso acolhedor, percepção de pessoas novas e postura atenta para tirar dúvidas.',
    discRecomendado: ['I', 'S'],
    quadranteRecomendado: 'Pessoas / Informal',
    donsRecomendados: ['Hospitalidade', 'Misericórdia', 'Encorajamento', 'Evangelismo'],
    habilidadesRecomendadas: 'Facilidade de comunicação, memorização de nomes e rostos, simpatia natural e prontidão.',
  },
  {
    id: 'midia',
    nome: 'Mídia, Som & Produção',
    descricao: 'Operação dos bastidores do culto: mesa de som digital, câmeras, corte de transmissão ao vivo e projeção de letras.',
    expectativas: 'Atenção aos detalhes técnicos, chegada antecipada para testes de passagem de som e foco contínuo durante a liturgia.',
    discRecomendado: ['C', 'S'],
    quadranteRecomendado: 'Tarefas / Formal',
    donsRecomendados: ['Artesanato', 'Serviço', 'Comunicação Criativa', 'Administração'],
    habilidadesRecomendadas: 'Operação de áudio (X32/Wing etc.), software Holyrics/OBS/vMix, operação de câmeras e iluminação.',
  },
  {
    id: 'social',
    nome: 'Ação Social & Misericórdia',
    descricao: 'Suporte humanitário a famílias carentes, triagem de pedidos de socorro, cestas básicas e projetos na comunidade.',
    expectativas: 'Discrição absoluta, coração compassivo, disposição para serviço prático e sensibilidade às dores alheias.',
    discRecomendado: ['S', 'C'],
    quadranteRecomendado: 'Pessoas / Formal',
    donsRecomendados: ['Misericórdia', 'Serviço', 'Contribuição', 'Hospitalidade'],
    habilidadesRecomendadas: 'Triagem social, logística de arrecadações, visitação compassiva, organização comunitária.',
  },
  {
    id: 'gc',
    nome: 'Liderança de GC',
    descricao: 'Pastoreio e facilitação de Pequenos Grupos nos lares, acolhimento relacional, comunhão e multiplicação.',
    expectativas: 'Liderança servidora, vida diária de oração, pontualidade no relatório semanal e zelo pelo cuidado mútuo dos membros.',
    discRecomendado: ['D', 'I'],
    quadranteRecomendado: 'Tarefas / Informal',
    donsRecomendados: ['Liderança', 'Pastorado', 'Discernimento', 'Fé', 'Encorajamento'],
    habilidadesRecomendadas: 'Facilitação de conversas em grupo, hospitalidade no lar, mentoria e resolução pacífica de conflitos.',
  },
  {
    id: 'intercessao',
    nome: 'Intercessão & Oração',
    descricao: 'Sustentação espiritual da igreja, cobertura dos cultos, vigílias e clamor confidencial pelos pedidos de oração.',
    expectativas: 'Sigilo pastoral inegociável, maturidade espiritual, vida profunda no secreto e perseverança na oração.',
    discRecomendado: ['S', 'C'],
    quadranteRecomendado: 'Pessoas / Formal',
    donsRecomendados: ['Intercessão', 'Fé', 'Discernimento', 'Sabedoria'],
    habilidadesRecomendadas: 'Fervor e constância devocional, escuta sensível do Espírito Santo e discrição ética.',
  },
  {
    id: 'gestao',
    nome: 'Gestão & Apoio',
    descricao: 'Secretaria, patrimônio, organização de arquivos eclesiásticos, suporte logístico e apoio aos ministérios.',
    expectativas: 'Compromisso com prazos, organização metódica de processos, ética com dados confidenciais e proatividade.',
    discRecomendado: ['C', 'D'],
    quadranteRecomendado: 'Tarefas / Formal',
    donsRecomendados: ['Administração', 'Serviço', 'Sabedoria', 'Conhecimento'],
    habilidadesRecomendadas: 'Informática, Excel/planilhas, organização de compras, redação e processos administrativos.',
  },
];
