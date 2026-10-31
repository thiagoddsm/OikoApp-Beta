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

export interface DiscBlindspotItem {
  letter: DiscLetter;
  title: string;
  summary: string;
  avoidDelegating: string;
  riskUnderStress: string;
  idealPartner: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const DISC_BLINDSPOT_META: Record<DiscLetter, DiscBlindspotItem> = {
  D: {
    letter: 'D',
    title: 'Baixa Assertividade e Dificuldade de Confronto',
    summary:
      'Tende a hesitar em tomar decisões difíceis, assumir comandos sob pressão ou confrontar pessoas diretamente quando necessário.',
    avoidDelegating:
      'Evite colocá-lo para gerenciar conflitos acalorados, demissões/desligamentos ministeriais ou cobranças duras de metas e prazos.',
    riskUnderStress: 'Pode se calar, recuar diante de oposições e acumular sobrecarga para não desagradar.',
    idealPartner: 'Faz excelente dupla com alguém de perfil D (Executor) que assuma a frente firme das decisões difíceis.',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-800',
    borderColor: 'border-red-200',
  },
  I: {
    letter: 'I',
    title: 'Reserva Social e Fadiga por Exposição Excessiva',
    summary:
      'Gasta muita energia em ambientes de networking constante, recepção de multidões ou quando precisa animar pessoas ativamente.',
    avoidDelegating:
      'Evite delegar funções de mestre de cerimônias, acolhimento de novos visitantes na porta ou mobilização espontânea de grandes grupos.',
    riskUnderStress: 'Pode se isolar, parecer distante ou perder a energia rapidamente em eventos muito barulhentos e sociais.',
    idealPartner: 'Faz excelente dupla com alguém de perfil I (Comunicador) que cuide do palco e da conexão interpessoal.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
  },
  S: {
    letter: 'S',
    title: 'Inquietação com Rotina e Dificuldade em Processos Longos',
    summary:
      'Fica entediado com facilidade em tarefas repetitivas, rotinas de bastidores lentas ou ministérios que exigem paciência de longo prazo.',
    avoidDelegating:
      'Evite delegar serviços de manutenção contínua, aconselhamentos longos e pacientes, ou tarefas que exijam permanência na mesma função por horas.',
    riskUnderStress: 'Fica impaciente, busca mudanças repentinas sem necessidade e pode abandonar tarefas pela metade.',
    idealPartner: 'Faz excelente dupla com alguém de perfil S (Cuidador) que garanta a constância, o ritmo calmo e a sustentação contínua.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderColor: 'border-emerald-200',
  },
  C: {
    letter: 'C',
    title: 'Baixa Afinidade Burocrática e Risco em Detalhes Rígidos',
    summary:
      'Drena energia rapidamente com relatórios minuciosos, conferência de planilhas, regras complexas ou auditorias detalhadas.',
    avoidDelegating:
      'Evite delegar tarefas de fechamento financeiro, preenchimento burocrático estrito de relatórios ou funções técnicas sem checklist prévio.',
    riskUnderStress: 'Pode cometer erros por desatenção a detalhes técnicos ou tentar burlar processos para terminar mais rápido.',
    idealPartner: 'Faz excelente dupla com alguém de perfil C (Analítico) que revise os detalhes, organize os checklists e garanta a conformidade.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    borderColor: 'border-blue-200',
  },
};

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
