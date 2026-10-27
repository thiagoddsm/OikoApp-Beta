import { getAdminDb } from '../src/lib/firebase-admin';

const STAGES = [
  {
    key: 'cidade',
    name: 'Cidade',
    order: 1,
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    automationsEnabled: true,
    description: 'Pessoas Não Alcançadas (Não vale pessoas de outras igrejas)',
    profile: 'Pessoas Não Alcançadas',
    characteristic: 'Alvo Evangelístico',
    steps: [
      'Você conhece o evangelho de Jesus?',
      'Já foi de alguma igreja?',
      'Você sabe o que motiva as pessoas a estarem na igreja?',
      'Em momentos difíceis, onde você costuma buscar força ou direção?',
      'Você acredita que a fé pode trazer paz e clareza em meio às pressões do dia a dia?',
      'Se existisse um lugar onde você pudesse recomeçar sem julgamentos, você daria uma chance?',
      'Gostaria de conhecer a nossa igreja?'
    ]
  },
  {
    key: 'novo_convertido',
    name: 'Novo Convertido',
    order: 2,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    automationsEnabled: true,
    description: 'Alguém Recém Alcançado',
    profile: 'Alguém Recém Alcançado',
    characteristic: 'Recém chegado',
    steps: [
      'Você entende sua decisão?',
      'Você sabe ler a bíblia e orar?',
      'Porque a igreja é importante e como o GC lida com isso?',
      'O que significa o batismo e porque precisamos nos batizar?',
      'Como é a sua realidade familiar? Precisa perdoar?',
      'Você entende o que significa santidade?',
      'Uma nova visão de mundo'
    ],
    stepLinks: {
      0: '/discipulado/batismo/encontro-1'
    }
  },
  {
    key: 'batismo',
    name: 'Batismo',
    order: 3,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    automationsEnabled: true,
    description: 'Alguém que entendeu a base da nossa fé e está com suas feridas em processo de tratamento',
    profile: 'Alguém que entendeu a base da nossa fé',
    characteristic: 'Ensinável',
    steps: [
      'Nós precisamos olhar com novos olhos...',
      'Porque escolhemos uma visão?',
      'Entende que cada um recebeu um dom e isso forma o corpo?',
      'Sabe porque dividir o serviço voluntário e o cuidado de pessoas faz diferença?',
      'Sabe porque somos servos (serviço voluntário)?',
      'Está com o coração aberto para uma nova visão (Desconstruir para construir)?',
      'Ao decidir se batizar, quais dores ou experiências do seu passado tocaram mais profundamente o seu coração —'
    ]
  },
  {
    key: 'pertencer',
    name: 'Pertencer',
    order: 4,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    automationsEnabled: true,
    description: 'Membro: É batizado, está em um GC, está entendendo a importância de servir e quer caminhar como IBM',
    profile: 'Membro',
    characteristic: 'Disposto',
    steps: [
      'Falar, no Reino, é compromisso. Tem praticado?',
      'Os prejuízos de um servo não comprometido',
      'A leveza da unidade',
      'Nossos recursos a disposição (tempo, talento e dinheiro)',
      'Porque somos dizimistas? Explicar a base bíblica da gratidão e pertencimento.',
      'Uma jornada de salvação, a busca pelo preparo',
      'O compromisso cobra excelência'
    ]
  },
  {
    key: 'crescer',
    name: 'Crescer',
    order: 5,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    automationsEnabled: true,
    description: 'Membro Consolidado: É dizimista, comprometido com o GC e com o serviço (visão) buscando capacitação constante',
    profile: 'Membro Consolidado',
    characteristic: 'Tratado',
    steps: [
      'As tarefas não são maiores que as pessoas',
      'O quanto é importante cuidar de alguém?',
      'Qual a sua motivação em crescer? O que é crescer em seu coração?',
      'Você tem vontade e prazer em ser atencioso, e se sente bem ao cuidar de alguém que precise de...',
      'No trabalho, na faculdade, em casa, na rua, no mercado, você quando tem oportunidade fala de Cristo?',
      'O que te motiva a cuidar do próximo? e "De que maneira você se sente parte do que Deus tem feito..."',
      'Está enfrentando algum momento difícil? Luto, doenças emocionais, doenças físicas, dificuldade financeira...'
    ]
  },
  {
    key: 'cuidar',
    name: 'Cuidar (Lidere 1)',
    order: 6,
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    automationsEnabled: true,
    description: 'Líder em Treinamento: Disposto a cuidar de outras pessoas (discreto), obediente e proativo. Prioriza o compromisso mais do que o conforto',
    profile: 'Líder em Treinamento',
    characteristic: 'Cooperador Intencional',
    steps: [
      'De que forma você tem percebido que Deus quer usar sua vida hoje para fortalecer outras pessoas na fé?',
      'Quem, ao seu redor, precisa de acompanhamento ou encorajamento — e como você pode se aproximar intencionalmente dessa pessoa?',
      'Qual área da sua vida espiritual você sente que precisa amadurecer para servir melhor e cuidar de mais pessoas?',
      'Você sabia que todos nós temos insegurança nos sentimos incapazes? Se você sente isso, está no caminho certo. Isso demonstra sua dependência de Deus.',
      'Como você pode transformar sua obediência em uma cultura de discipulado, formando outros que também priorizem compromisso acima do conforto?',
      'Explicar sobre amor sacrificial baseado nos textos bíblicos do amor sacrificial em Timóteo e do líder servo e Marcos 10:45',
      'Passar a confiança de que você discipulador está pronto pra servir e ajudar o seu discípulo em todos os desafios e dificuldades. Estar junto de verdade.'
    ]
  },
  {
    key: 'liderar',
    name: 'Liderar (Lidere 2)',
    order: 7,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    automationsEnabled: true,
    description: 'Líder de GC: Mobilizador de pessoas e leal (discreto com problemas apresentados e comprometido com o líder que cuida dele)',
    profile: 'Líder de GC',
    characteristic: 'Confiável',
    steps: [
      'É intencional nos relacionamentos? (não espera acontecer, ele provoca). Ele é como Barnabé. Olha para aquele que...',
      'Qual sua perspectiva de futuro? (Pessoal, ministerial e familiar).',
      'Sua família apoia e entende seu ministério? E como está seu devocional com eles?',
      'Como você pode usar sua influência para formar novos cuidadores, sem perder a essência da lealdade e da discrição...',
      'De que maneira você tem transformado as confidências que recebe em intercessão estratégica e acompanhamento...',
      'Seus discípulos estão aprendendo apenas com o que você ensina ou principalmente com o que você vive — e que...',
      'Todo esse cuidado tem que ser otimizado, regular e intencional. Nunca, jamais, atrapalhar seu tempo de qualidade...'
    ]
  },
  {
    key: 'lider_area',
    name: 'Líder de Área',
    order: 8,
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    automationsEnabled: true,
    description: 'Está completamente comprometido com as atividades da igreja. Guarda a visão e dá suporte aos seus liderados',
    profile: 'Líder de Área',
    characteristic: 'Supervisor / Pilar',
    steps: [
      'Consolidação e expansão de líderes',
      'Supervisão e pastoreio da rede de GCs',
      'Guardião da visão e alinhamento pastoral'
    ]
  }
];

const TARGET_TENANTS = ['w3m93SHQeBRhiDnt7208', 'tenant_default', 'default'];

async function main() {
  const db = getAdminDb();
  console.log('--- Seeding journey_stages ---');

  for (const tenantId of TARGET_TENANTS) {
    console.log(`\nSeeding stages for tenant: ${tenantId}`);
    for (const stage of STAGES) {
      const docId = `${tenantId}_${stage.key}`;
      const stageData = {
        tenantId,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        automationsEnabled: stage.automationsEnabled,
        description: stage.description,
        profile: stage.profile,
        characteristic: stage.characteristic,
        steps: stage.steps,
        ...(stage.stepLinks ? { stepLinks: stage.stepLinks } : {}),
        updatedAt: new Date().toISOString()
      };

      await db.collection('journey_stages').doc(docId).set(stageData, { merge: true });
      console.log(`  ✓ ${stage.name} (order: ${stage.order}) -> doc: ${docId}`);
    }
  }

  console.log('\nSeed concluído com sucesso!');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
