/**
 * Inventário DISC do Molde de Servo (versão 1).
 * 12 perguntas de escolha forçada: 9 do dia a dia do ministério + 3 "sob pressão"
 * (as 3 últimas são usadas como critério de desempate).
 *
 * As letras NUNCA são exibidas ao aluno.
 */

export type DiscLetter = 'D' | 'I' | 'S' | 'C';

export interface DiscOption {
  l: DiscLetter;
  text: string;
}

export interface DiscQuestion {
  id: string;
  text: string;
  block: 1 | 2;
  /** true = pergunta do bloco "sob pressão", usada como desempate */
  tiebreaker?: boolean;
  options: DiscOption[]; // sempre na ordem D, I, S, C (a tela embaralha de forma determinística)
}

export const DISC_VERSION = 1;

export const DISC_BLOCK_TITLES: Record<1 | 2, { title: string; subtitle: string }> = {
  1: {
    title: 'No dia a dia do ministério',
    subtitle: 'Escolha o que mais parece com você naturalmente.',
  },
  2: {
    title: 'E quando a pressão aumenta?',
    subtitle: 'Pense em como você reage quando tudo fica tenso.',
  },
};

export const DISC_QUESTIONS: DiscQuestion[] = [
  {
    id: 'Q1',
    block: 1,
    text: 'Ao receber uma nova responsabilidade no ministério, eu costumo…',
    options: [
      { l: 'D', text: 'Assumir a frente e começar a agir logo' },
      { l: 'I', text: 'Chamar pessoas e empolgar o time' },
      { l: 'S', text: 'Perguntar como posso ajudar e seguir num ritmo constante' },
      { l: 'C', text: 'Entender bem os detalhes e planejar antes de começar' },
    ],
  },
  {
    id: 'Q2',
    block: 1,
    text: 'Numa reunião de equipe, geralmente sou quem…',
    options: [
      { l: 'D', text: 'Vai direto ao ponto e propõe a decisão' },
      { l: 'I', text: 'Anima a conversa e traz ideias novas' },
      { l: 'S', text: 'Escuta com atenção e busca o consenso' },
      { l: 'C', text: 'Faz perguntas para esclarecer dados e riscos' },
    ],
  },
  {
    id: 'Q3',
    block: 1,
    text: 'Ao planejar um culto, retiro ou conferência, o que mais me importa é…',
    options: [
      { l: 'D', text: 'Que o objetivo seja alcançado' },
      { l: 'I', text: 'Que as pessoas se sintam bem-vindas e envolvidas' },
      { l: 'S', text: 'Que tudo aconteça com tranquilidade, sem atropelos' },
      { l: 'C', text: 'Que cada detalhe esteja correto e bem organizado' },
    ],
  },
  {
    id: 'Q4',
    block: 1,
    text: 'Um voluntário novo chega à minha equipe. Meu jeito natural é…',
    options: [
      { l: 'D', text: 'Passar uma tarefa e deixar que aprenda fazendo' },
      { l: 'I', text: 'Apresentá-lo a todos e fazê-lo sentir-se parte do grupo' },
      { l: 'S', text: 'Acompanhá-lo de perto, com paciência, até ele se sentir seguro' },
      { l: 'C', text: 'Explicar como as coisas funcionam, passo a passo' },
    ],
  },
  {
    id: 'Q5',
    block: 1,
    text: 'Prefiro servir em atividades que sejam…',
    options: [
      { l: 'D', text: 'Desafiadoras, com metas claras para vencer' },
      { l: 'I', text: 'Dinâmicas, com muito contato e movimento' },
      { l: 'S', text: 'Constantes e previsíveis, onde posso contribuir por muito tempo' },
      { l: 'C', text: 'Bem definidas, onde a qualidade faz diferença' },
    ],
  },
  {
    id: 'Q6',
    block: 1,
    text: 'Quando alguém discorda de mim, minha tendência é…',
    options: [
      { l: 'D', text: 'Defender meu ponto com firmeza' },
      { l: 'I', text: 'Tentar convencer usando argumentação rápida e simpatia' },
      { l: 'S', text: 'Ceder para preservar a harmonia, se não for algo essencial' },
      { l: 'C', text: 'Apresentar fatos e argumentos para mostrar o que é mais correto' },
    ],
  },
  {
    id: 'Q7',
    block: 1,
    text: 'As pessoas costumam me descrever como alguém…',
    options: [
      { l: 'D', text: 'Decidido e determinado' },
      { l: 'I', text: 'Comunicativo e inspirador' },
      { l: 'S', text: 'Calmo e confiável' },
      { l: 'C', text: 'Cuidadoso e criterioso' },
    ],
  },
  {
    id: 'Q8',
    block: 1,
    text: 'Quando os planos mudam de última hora, eu…',
    options: [
      { l: 'D', text: 'Me adapto rápido e já proponho outro caminho' },
      { l: 'I', text: 'Vejo como oportunidade e animo os demais' },
      { l: 'S', text: 'Prefiro entender o motivo e ter um tempo para me ajustar' },
      { l: 'C', text: 'Quero revisar o plano para garantir que continue funcionando' },
    ],
  },
  {
    id: 'Q9',
    block: 1,
    text: 'O que mais me motiva ao servir é…',
    options: [
      { l: 'D', text: 'Ver resultados concretos e avanço' },
      { l: 'I', text: 'Ver pessoas conectadas e a alegria no ambiente' },
      { l: 'S', text: 'Saber que apoiei alguém com fidelidade' },
      { l: 'C', text: 'Saber que o trabalho foi feito com excelência' },
    ],
  },
  {
    id: 'Q10',
    block: 2,
    tiebreaker: true,
    text: 'Quando o prazo aperta e tudo parece desandar, eu…',
    options: [
      { l: 'D', text: 'Tomo o controle e redistribuo as tarefas' },
      { l: 'I', text: 'Motivo o grupo e mantenho o clima leve' },
      { l: 'S', text: 'Mantenho a calma e continuo fazendo a minha parte' },
      { l: 'C', text: 'Reviso as prioridades e confiro o que não pode falhar' },
    ],
  },
  {
    id: 'Q11',
    block: 2,
    tiebreaker: true,
    text: 'Quando estou sob muita pressão, percebo que fico…',
    options: [
      { l: 'D', text: 'Mais direto e exigente' },
      { l: 'I', text: 'Mais falante, buscando apoio das pessoas' },
      { l: 'S', text: 'Mais reservado, evitando conflitos' },
      { l: 'C', text: 'Mais crítico e atento aos erros' },
    ],
  },
  {
    id: 'Q12',
    block: 2,
    tiebreaker: true,
    text: 'Se algo dá errado durante um evento ao vivo (falha no som, atraso, imprevisto), minha reação é…',
    options: [
      { l: 'D', text: 'Resolver na hora, mesmo que seja improvisando' },
      { l: 'I', text: 'Aliviar a tensão e acalmar quem está nervoso' },
      { l: 'S', text: 'Apoiar a equipe e cuidar para ninguém se sentir culpado' },
      { l: 'C', text: 'Focar em entender e corrigir a causa do problema imediatamente' },
    ],
  },
];

/**
 * Embaralha as alternativas de forma DETERMINÍSTICA (mesma ordem em todo render e para todo aluno),
 * evitando viés de posição sem quebrar a retomada de progresso.
 */
export function getShuffledOptions(question: DiscQuestion): DiscOption[] {
  let seed = 0;
  for (const ch of question.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const arr = [...question.options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
