import { CourseQuizQuestion } from '@/domain/course';

export const APOIAR_AULA_1_QUESTIONS: CourseQuizQuestion[] = [
  {
    id: 1,
    type: 'multiple_choice',
    category: 'Ponto de Partida',
    question: 'Qual é o contraste cirúrgico entre o papel de um supervisor corporativo e um supervisor de área na igreja?',
    correct: 'Na empresa, a autoridade é imposta para fiscalizar metas; na igreja, a missão é ser suporte, sustento e amigo da liderança.',
    distractors: [
      'Na empresa, a gerência é delegada; na igreja, o supervisor assume todas as células para bater a meta de multiplicação.',
      'Na empresa, a prestação de contas é facultativa; na igreja, o supervisor audita rigidamente as ofertas e dízimos de cada célula.',
      'Na empresa, o foco é em pessoas; na igreja local, a prioridade absoluta da supervisão são os relatórios numéricos semanais.'
    ],
    feedback: 'Perfeito! No Reino de Deus, o supervisor não opera por auditoria e cobrança fria; sua missão é dar sustento e alívio pastoral a quem está na trincheira.'
  },
  {
    id: 2,
    type: 'multiple_choice',
    category: 'Três Missões da Igreja',
    question: 'A igreja local atua em três movimentos: rumo a Deus (adoração), rumo ao mundo (evangelismo) e rumo aos crentes. Onde a supervisão se encaixa com precisão?',
    correct: 'Na missão rumo aos crentes (Ef 4:11-12): equipar, sustentar e amparar os santos que realizam o ministério das células.',
    distractors: [
      'Exclusivamente na missão rumo a Deus, organizando as escalas litúrgicas do domingo na nave da igreja.',
      'Apenas na missão rumo ao mundo, através de campanhas de tráfego e marketing de evangelismo de rua.',
      'Em um quarto movimento burocrático de controle patrimonial e financeiro desvinculado dos santos.'
    ],
    feedback: 'Exato! Conforme Efésios 4:11-12, a supervisão encarna a terceira missão: preparar e sustentar os santos para a obra do ministério.'
  },
  {
    id: 3,
    type: 'discursive',
    category: 'Prática Pastoral',
    question: 'Um líder de GC sob sua supervisão te procura numa terça-feira dizendo que apenas 3 pessoas foram à célula e ele pensa em entregar o grupo. Como supervisor facilitador (suporte), qual a sua primeira reação prática com ele?',
    keywords: ['escuta', 'ouvir', 'orar', 'oração', 'café', 'amigo', 'coração', 'abraço', 'ombro', 'apoiar', 'junto', 'conversar', 'cuidado', 'acolher', 'almoço'],
    feedback: 'Excelente discernimento! O supervisor facilitador não inicia cobrando números, mas acolhe a dor, ouve com sensibilidade e coloca os ombros sob a carga.'
  },
  {
    id: 4,
    type: 'multiple_choice',
    category: 'A Lógica Invertida',
    question: 'Em Marcos 10:43-44, Jesus afirma: "Não será assim entre vocês. Ao contrário...". Como a estrutura de autoridade do Reino é representada?',
    correct: 'Como uma pirâmide invertida: a ponta menor (o supervisor) fica na base sustentando os líderes e as ovelhas.',
    distractors: [
      'Como uma pirâmide corporativa clássica: o supervisor no topo delegando o peso do trabalho para os líderes abaixo.',
      'Como um círculo horizontal onde ninguém assume a responsabilidade de sustento e mentoria pastoral.',
      'Como uma torre de comando militar onde ordens não são questionadas e a cobrança é vertical.'
    ],
    feedback: 'Com precisão! No Reino, quem quer ser o maior coloca-se na base como servo, sustentando a carga dos que estão na linha de frente.'
  },
  {
    id: 5,
    type: 'multiple_choice',
    category: 'Dinâmica da Casa',
    question: 'Na dinâmica da casa espiritual (Varanda, Sala e Cozinha), por que a cozinha representa o lugar do líder maduro?',
    correct: 'Porque tem pouco espaço, não tem sofás confortáveis e faz calor, mas é onde a família é alimentada de verdade.',
    distractors: [
      'Porque é o cômodo mais espaçoso da casa onde os visitantes sentam para serem aplaudidos.',
      'Porque na cozinha fica o cofre e o controle administrativo do patrimônio da igreja.',
      'Porque é o único lugar climatizado onde os líderes descansam enquanto outros trabalham.'
    ],
    feedback: 'Maravilhoso! Quem alimenta toda a casa chegou à cozinha porque amadureceu ministerialmente. Servir nos bastidores sem buscar holofotes é maturidade de Reino.'
  },
  {
    id: 6,
    type: 'multiple_choice',
    category: 'Pilar 1: Sensibilidade',
    question: 'Em Romanos 15:1, Paulo ordena que os fortes devem suportar as debilidades dos fracos. No grego bíblico, o que expressa o termo "Bastazo"?',
    correct: 'Significa colocar os próprios ombros por baixo da carga pesada para que o irmão não seja esmagado pelo fardo.',
    distractors: [
      'Significa advertir o irmão publicamente para que ele crie vergonha e melhore seu desempenho.',
      'Significa tolerar o fraco com distanciamento sem se envolver diretamente em sua dor.',
      'Significa substituir o líder e fechar a célula de imediato para não queimar a média da rede.'
    ],
    feedback: 'Perfeito! Bastazo é um termo físico e sacrificial: colocar os ombros debaixo do fardo para que o outro respire e continue na corrida.'
  },
  {
    id: 7,
    type: 'multiple_choice',
    category: 'Pilar 2 & 3: Encorajamento e GD',
    question: 'Em Filemom 1:20, Paulo diz a um amigo: "Reanime o meu coração em Cristo!". Por que essa atitude e a reunião de GD são fundamentais para o supervisor?',
    correct: 'Porque líderes de célula precisam encontrar no supervisor um amigo que previna a solidão, alinhando vida e gestão no GD.',
    distractors: [
      'Porque a reunião de GD serve primordialmente para notificar os líderes que não atingiram a meta de multiplicação.',
      'Porque pastores não têm tempo para amizade com líderes, restando apenas um alinhamento funcional de relatórios.',
      'Porque o GD é o único momento permitido para que o líder reclame de seus membros perante outros supervisores.'
    ],
    feedback: 'Exato! O líder não desabafa com cobranças frias; ele precisa de um amigo que reanime seu coração e um GD focado em comunhão e solução prática de gargalos.'
  },
  {
    id: 8,
    type: 'discursive',
    category: 'Pacto Pastoral',
    question: 'Escreva 1 ação prática de sustentação ("colocar os ombros debaixo da carga") que você se compromete a fazer esta semana por um líder sob sua cobertura:',
    keywords: ['oração', 'orar', 'café', 'visita', 'mensagem', 'ligar', 'conversar', 'escuta', 'escutar', 'ajudar', 'apoiar', 'cuidado', 'almoço', 'abraçar'],
    feedback: 'Compromisso gravado com louvor! Essa ação prática transforma a teologia do suporte em alívio vivo para quem está servindo.'
  }
];

export const APOIAR_AULA_2_QUESTIONS: CourseQuizQuestion[] = [
  {
    id: 1,
    type: 'multiple_choice',
    category: 'Princípio Bíblico da Escuta',
    question: 'De acordo com Tiago 1:19, qual deve ser a postura prioritária do líder e supervisor no cuidado pastoral?',
    correct: 'Pronto para ouvir, tardio para falar e tardio para se irar.',
    distractors: [
      'Pronto para repreender, rápido nas respostas e inflexível nas correções.',
      'Focado em aplicar correções imediatas para quem demonstrar fraqueza na fé.',
      'Orientado a delegar o acolhimento a terceiros para não se desgastar emocionalmente.'
    ],
    feedback: 'Excelente! A escuta ativa e paciente é a primeira ferramenta de cura e alívio pastoral no discipulado.'
  },
  {
    id: 2,
    type: 'multiple_choice',
    category: 'Prevenção da Solidão',
    question: 'Por que líderes de GC frequentemente experimentam sensação de solidão ministerial?',
    correct: 'Porque sentem que só são procurados para prestar contas de metas, sem encontrar espaço seguro para abrir o coração.',
    distractors: [
      'Porque não leem a Bíblia suficientemente durante a semana.',
      'Porque a igreja não oferece remuneração financeira aos voluntários.',
      'Porque o número de membros da célula foi reduzido.'
    ],
    feedback: 'Exato! O supervisor precisa ser o amigo onde o líder é pastoreado e acolhido sem receio de julgamento.'
  },
  {
    id: 3,
    type: 'discursive',
    category: 'Acolhimento na Prática',
    question: 'Se um líder liderado te procurar em crise de cansaço ou desânimo, que pergunta de escuta empática você faria antes de dar conselhos?',
    keywords: ['ouvir', 'escuta', 'sinto', 'ajudar', 'orar', 'conte', 'coração', 'tempo', 'descanso', 'junto', 'entender'],
    feedback: 'Sensibilidade pastoral exemplar! Perguntas abertas de acolhimento validam a dor antes de propor soluções.'
  },
  {
    id: 4,
    type: 'multiple_choice',
    category: 'Sigilo Ministerial',
    question: 'Qual é o impacto do sigilo pastoral na supervisão de células?',
    correct: 'Garante que as vulnerabilidades do líder serão guardadas em confidência, gerando ambiente de cura e proteção.',
    distractors: [
      'É uma formalidade sem impacto real nos relacionamentos da igreja.',
      'Serve para ocultar problemas graves sem envolver os pastores da igreja.',
      'É opcional e pode ser compartilhado como exemplo de pregação sem autorização.'
    ],
    feedback: 'Perfeito! Sem confidência e sigilo não existe vulnerabilidade genuína nem cura mútua.'
  },
  {
    id: 5,
    type: 'multiple_choice',
    category: 'Oração Sacerdotal',
    question: 'Ao final de um momento de escuta e acolhimento pastoral, como a oração do supervisor deve se caracterizar?',
    correct: 'Como uma oração sacerdotal de intercessão, ministrando paz, refrigério e a graça restauradora de Cristo.',
    distractors: [
      'Como uma cobrança enfática de metas numéricas para a semana seguinte.',
      'Como uma oração curta e apressada para cumprir o protocolo da reunião.',
      'Como um desabafo das frustrações pessoais do próprio supervisor.'
    ],
    feedback: 'Glorioso! A oração sacerdotal coloca o liderado sob a graça e o refrigério do Espírito Santo.'
  },
  {
    id: 6,
    type: 'discursive',
    category: 'Pacto Semanal de Cuidado',
    question: 'Escreva um compromisso prático de escuta que você exercerá esta semana com alguém da sua equipe (ex: café de 30min sem pauta funcional):',
    keywords: ['café', 'ouvir', 'ligação', 'conversa', 'almoço', 'tempo', 'escutar', 'visita', 'orar'],
    feedback: 'Compromisso gravado com louvor! Essa prática salva líderes da exaustão e fortalece o Corpo.'
  }
];

export function getSeedQuestionsForCourseLesson(courseId?: string, courseName?: string, lessonNumber: number = 1): CourseQuizQuestion[] {
  const isApoiar = (courseId && courseId.toLowerCase().includes('apoiar')) || 
                   (courseName && courseName.toLowerCase().includes('apoiar'));

  if (isApoiar) {
    if (lessonNumber === 1) {
      return JSON.parse(JSON.stringify(APOIAR_AULA_1_QUESTIONS));
    }
    if (lessonNumber === 2) {
      return JSON.parse(JSON.stringify(APOIAR_AULA_2_QUESTIONS));
    }
  }

  return [];
}
