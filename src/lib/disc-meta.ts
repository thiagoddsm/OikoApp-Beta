import type { DiscLetter } from './disc-questions';

export interface DiscMetaItem {
  letter: DiscLetter;
  name: string; // Dominância
  nickname: string; // Executor
  emoji: string;
  description: string;
  strengths: string[];
  /** como o líder deve se comunicar / ambiente ideal (exibição no cartão) */
  serviceStyle: string;
  // classes Tailwind
  bar: string;
  text: string;
  bg: string;
  border: string;
}

export const DISC_META: Record<DiscLetter, DiscMetaItem> = {
  D: {
    letter: 'D',
    name: 'Dominância',
    nickname: 'Executor',
    emoji: '🔴',
    description:
      'Direto, decidido e pioneiro. Gosta de desafios, toma a frente e foca em resultados. Brilha onde é preciso agir rápido e abrir caminho.',
    strengths: ['Iniciativa', 'Decisão rápida', 'Foco em resultado'],
    serviceStyle: 'Rende melhor com autonomia, metas claras e desafios.',
    bar: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  I: {
    letter: 'I',
    name: 'Influência',
    nickname: 'Comunicador',
    emoji: '🟡',
    description:
      'Comunicativo, acolhedor e dinâmico. Gosta de pessoas, anima o ambiente e conecta quem chega. Brilha onde há contato e movimento.',
    strengths: ['Comunicação', 'Entusiasmo', 'Conexão com pessoas'],
    serviceStyle: 'Rende melhor em equipe, com liberdade para interagir e reconhecimento.',
    bar: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  S: {
    letter: 'S',
    name: 'Estabilidade',
    nickname: 'Cuidador',
    emoji: '🟢',
    description:
      'Paciente, leal e constante. Gosta de rotina, escuta e acompanha de perto. Brilha em cuidado contínuo e apoio de longo prazo.',
    strengths: ['Paciência', 'Lealdade', 'Escuta e cuidado'],
    serviceStyle: 'Rende melhor com rotina previsível, aviso prévio de mudanças e ambiente harmonioso.',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  C: {
    letter: 'C',
    name: 'Conformidade',
    nickname: 'Analítico',
    emoji: '🔵',
    description:
      'Analítico, detalhista e criterioso. Gosta de qualidade, processos claros e precisão. Brilha onde excelência e organização fazem diferença.',
    strengths: ['Precisão', 'Organização', 'Qualidade'],
    serviceStyle: 'Rende melhor com informações claras, tempo para planejar e padrões definidos.',
    bar: 'bg-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};
