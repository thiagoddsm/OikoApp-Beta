export interface QuestaoDiagnostico {
  id: string;
  texto: string;
}

export interface PrincipioDiagnostico {
  numero: number;
  nome: string;
  dominioId: string;
  planoAcao: string;
  questoes: QuestaoDiagnostico[];
}

export interface DominioDiagnostico {
  id: string;
  nome: string;
  subtitulo: string;
  insightBaixo: string;
  principios: PrincipioDiagnostico[];
}

export interface IdentificacaoIgreja {
  igreja_nome: string;
  pastor_nome: string;
  email: string;
  telefone: string;
  funcao_igreja: string;
  cidade: string;
  uf: string;
  porte_igreja: string;
  igreja_da_cidade?: boolean;
}

export const PASTORES_OFICIAIS = [
  'Pr. Diego',
  'Pr. Thiago',
  'Pr. Leo',
  'Pr. José Ricardo',
  'Pr. Hugo Campos',
];

export function normalizarPastorNome(nome: string = ''): string {
  const limpo = (nome || '').trim().toLowerCase();
  if (limpo.includes('hugo')) return 'Pr. Hugo Campos';
  if (limpo.includes('diego')) return 'Pr. Diego';
  if (limpo.includes('thiago')) return 'Pr. Thiago';
  if (limpo.includes('leo') || limpo.includes('leonardo')) return 'Pr. Leo';
  if (limpo.includes('ricardo')) return 'Pr. José Ricardo';
  return (nome || '').trim();
}

export const ESCALA_AVALIACAO = [
  {
    valor: 1,
    label: 'Não está indo bem',
    shortLabel: 'Não está bem',
    mobileLabel: 'Não está bem',
    desc: 'Crítico / Inexistente',
  },
  {
    valor: 2,
    label: 'Abaixo do esperado',
    shortLabel: 'Abaixo do esperado',
    mobileLabel: 'Abaixo',
    desc: 'Abaixo do esperado',
  },
  {
    valor: 3,
    label: 'Em desenvolvimento',
    shortLabel: 'Em desenvolvimento',
    mobileLabel: 'Em desenv.',
    desc: 'Em desenvolvimento',
  },
  {
    valor: 4,
    label: 'Está indo bem',
    shortLabel: 'Está indo bem',
    mobileLabel: 'Está bem',
    desc: 'Está indo bem',
  },
  {
    valor: 5,
    label: 'Excelente',
    shortLabel: 'Excelente',
    mobileLabel: 'Excelente',
    desc: 'Estamos fazendo com excelência',
  },
];

export const FUNCOES_IGREJA = [
  { id: 'pastor_senior', label: 'Pastor Sênior' },
  { id: 'pastor_auxiliar', label: 'Pastor Auxiliar' },
  { id: 'lider_ministerio', label: 'Líder de Ministério' },
  { id: 'lider_grupo', label: 'Líder de Grupo / Célula' },
  { id: 'membro', label: 'Membro' },
];

export const PORTES_IGREJA = [
  { id: 'ate_50', label: 'Até 50 membros' },
  { id: '51_150', label: '51 a 150 membros' },
  { id: '151_500', label: '151 a 500 membros' },
  { id: '501_1500', label: '501 a 1.500 membros' },
  { id: 'mais_1500', label: 'Mais de 1.500 membros' },
];

export const DOMINIOS_DIAGNOSTICO: DominioDiagnostico[] = [
  {
    id: 'fundamentos',
    nome: 'Fundamentos & Visão',
    subtitulo: 'A base bíblica e o norte da igreja',
    insightBaixo:
      'Cuidado, pastor: sua igreja pode estar correndo rápido, mas na direção errada. Sem uma visão clara e base bíblica sólida, o esforço torna-se puramente humano e o cansaço da liderança é inevitável. Volte ao Princípio 3 e reafirme "para onde" vocês estão indo.',
    principios: [
      {
        numero: 1,
        nome: 'Fundamentação Bíblica',
        dominioId: 'fundamentos',
        planoAcao:
          'Pastor, retorne ao texto. Reavalie sua grade de pregação dos próximos 90 dias e garanta que ela seja expositiva e centrada na Palavra. Crie ou reative grupos de leitura bíblica e modele você mesmo o hábito do estudo diário diante da liderança.',
        questoes: [
          { id: 'p1_q1', texto: 'A mensagem é bíblica e fundamentada na Palavra.' },
          { id: 'p1_q2', texto: 'O conselho bíblico é a palavra final em nossas decisões administrativas.' },
          { id: 'p1_q3', texto: 'Estimulamos o estudo bíblico individual como base da nossa comunidade.' },
        ],
      },
      {
        numero: 3,
        nome: 'Visão Clara de Deus',
        dominioId: 'fundamentos',
        planoAcao:
          'Reserve um retiro com a equipe principal para reescrever a visão em uma frase memorizável. Comunique-a do púlpito por 6 semanas seguidas. Audite cada ministério: o que não serve à visão precisa ser ajustado, integrado ou encerrado.',
        questoes: [
          { id: 'p3_q1', texto: 'Nossa visão é clara, memorizável e comunicada com frequência.' },
          { id: 'p3_q2', texto: 'Nossos ministérios estão todos alinhados à visão principal da igreja.' },
          { id: 'p3_q3', texto: 'Cada membro sabe como sua contribuição ajuda a realizar a visão.' },
        ],
      },
      {
        numero: 7,
        nome: 'Autoavaliação Constante',
        dominioId: 'fundamentos',
        planoAcao:
          'Implemente uma reunião trimestral de avaliação com a liderança usando 3 a 5 indicadores claros (frequência, batismos, novos discípulos, voluntários ativos, ofertas). Tenha coragem de podar o que não dá fruto — Jesus elogiou o servo fiel, não o ocupado.',
        questoes: [
          { id: 'p7_q1', texto: 'Analisamos periodicamente nossos resultados espirituais e numéricos.' },
          { id: 'p7_q2', texto: 'Temos coragem de encerrar atividades que não dão mais frutos.' },
          { id: 'p7_q3', texto: 'Usamos métricas claras para entender as áreas de melhoria.' },
        ],
      },
      {
        numero: 12,
        nome: 'Identidade Local',
        dominioId: 'fundamentos',
        planoAcao:
          'Mapeie a sua cidade: quem é o seu povo, suas dores, seus anseios. Construa uma identidade que seja fiel à doutrina bíblica, mas viva no contexto local. Sua igreja precisa ser inconfundível na sua região.',
        questoes: [
          { id: 'p12_q1', texto: 'Nossa igreja possui uma identidade clara e relevante para nossa região.' },
          { id: 'p12_q2', texto: 'Não dependemos apenas de diretrizes externas para agir com relevância.' },
          { id: 'p12_q3', texto: 'O pastor tem autonomia espiritual para conduzir a visão local.' },
        ],
      },
      {
        numero: 13,
        nome: 'Tradição sem Tradicionalismo',
        dominioId: 'fundamentos',
        planoAcao:
          'Liste tudo o que sua igreja faz por costume e separe em duas colunas: mandamento bíblico vs. tradição humana. Mantenha o primeiro inegociável e tenha liberdade de reformar o segundo. Tradição sem espírito vira museu.',
        questoes: [
          { id: 'p13_q1', texto: 'Respeitamos nossa história, mas não deixamos o "sempre foi assim" travar o avanço.' },
          { id: 'p13_q2', texto: 'Distinguimos o que é mandamento bíblico do que é apenas costume cultural.' },
          { id: 'p13_q3', texto: 'Mudamos as formas sempre que necessário para preservar a essência.' },
        ],
      },
    ],
  },
  {
    id: 'lideranca',
    nome: 'Liderança & Gestão',
    subtitulo: 'Quem conduz, como conduz e por quanto tempo',
    insightBaixo:
      'O crescimento está sendo travado pela burocracia ou centralização. Descentralize para prevalecer. Líderes precisam liderar, não apenas administrar processos.',
    principios: [
      {
        numero: 2,
        nome: 'Dom de Liderança',
        dominioId: 'lideranca',
        planoAcao:
          'Mapeie os dons reais da sua liderança atual. Posicione cada pessoa onde ela é forte, não onde ela é amiga. Como pastor, proteja blocos da sua semana exclusivamente para liderar — não apenas para visitar e administrar.',
        questoes: [
          { id: 'p2_q1', texto: 'Nossos líderes são escolhidos por dons e competências, não por afinidade.' },
          { id: 'p2_q2', texto: 'O pastor principal dedica tempo para exercer seu dom de liderança.' },
          { id: 'p2_q3', texto: 'Há clareza sobre quem lidera e quem é liderado em cada esfera.' },
        ],
      },
      {
        numero: 5,
        nome: 'Espírito Empreendedor',
        dominioId: 'lideranca',
        planoAcao:
          'Crie um "fundo de inovação" no orçamento — mesmo que pequeno — para testar novas iniciativas a cada semestre. Celebre tentativas, não apenas resultados. Igrejas que prevalecem aprenderam a errar rápido e barato.',
        questoes: [
          { id: 'p5_q1', texto: 'Encorajamos novas iniciativas e riscos calculados pelo Reino.' },
          { id: 'p5_q2', texto: 'Investimos recursos em novos projetos com visão de futuro.' },
          { id: 'p5_q3', texto: 'Não temos medo de errar ao tentar métodos novos para alcançar pessoas.' },
        ],
      },
      {
        numero: 18,
        nome: 'Formação e Mentoria',
        dominioId: 'lideranca',
        planoAcao:
          'Pastor, ninguém prevalece sozinho. Estabeleça pelo menos 2 mentores na sua vida (um espiritual e um de gestão). Em paralelo, comprometa-se a discipular pessoalmente 3 a 5 líderes emergentes neste ano.',
        questoes: [
          { id: 'p18_q1', texto: 'O pastor principal tem mentores que o acompanham e desafiam.' },
          { id: 'p18_q2', texto: 'Investimos intencionalmente no aperfeiçoamento da liderança atual.' },
          { id: 'p18_q3', texto: 'Há um processo ativo de mentoria para levantar a próxima geração.' },
        ],
      },
      {
        numero: 20,
        nome: 'Agilidade e Desburocratização',
        dominioId: 'lideranca',
        planoAcao:
          'Audite seu fluxo de decisões: quantas pessoas precisam aprovar uma compra de R$ 200? Uma nova ideia? Reduza camadas. Dê autonomia com responsabilidade. Igreja burocrática perde o tempo de Deus.',
        questoes: [
          { id: 'p20_q1', texto: 'Nossa estrutura permite que decisões sejam tomadas com agilidade.' },
          { id: 'p20_q2', texto: 'Eliminamos processos burocráticos que travavam o crescimento.' },
          { id: 'p20_q3', texto: 'Líderes ministeriais têm autonomia real em seus escopos.' },
        ],
      },
      {
        numero: 21,
        nome: 'Permanência do Pastor',
        dominioId: 'lideranca',
        planoAcao:
          'Converse abertamente com sua liderança e família sobre permanência. Igrejas que prevalecem têm pastores que ficam — porque fruto exige raiz, e raiz exige tempo. Construa uma cultura que honre o ciclo longo.',
        questoes: [
          { id: 'p21_q1', texto: 'Existe uma perspectiva de longo prazo na liderança do pastor.' },
          { id: 'p21_q2', texto: 'A igreja entende e respeita os ciclos de amadurecimento do pastor.' },
          { id: 'p21_q3', texto: 'A estabilidade na liderança gera confiança visível na membresia.' },
        ],
      },
    ],
  },
  {
    id: 'espiritualidade',
    nome: 'Espiritualidade & Adoração',
    subtitulo: 'A vida com Deus que sustenta tudo',
    insightBaixo:
      'O ativismo pode estar substituindo a intimidade com Deus. Sem oração fervorosa e adoração autêntica, a igreja perde o poder do Espírito Santo e vira apenas uma organização secular. Priorize a oração antes da ação.',
    principios: [
      {
        numero: 4,
        nome: 'Prioridade na Oração',
        dominioId: 'espiritualidade',
        planoAcao:
          'Reative o altar. Estabeleça um dia/horário fixo de oração coletiva e participe pessoalmente. Antes de toda decisão importante de liderança, pare e ore — não como rito, mas como dependência real de Deus.',
        questoes: [
          { id: 'p4_q1', texto: 'A oração é o motor das decisões, não apenas um rito de abertura.' },
          { id: 'p4_q2', texto: 'Temos movimentos de oração que envolvem a membresia ativamente.' },
          { id: 'p4_q3', texto: 'Líderes são exemplos visíveis de uma vida de intercessão.' },
        ],
      },
      {
        numero: 6,
        nome: 'Integridade e Caráter',
        dominioId: 'espiritualidade',
        planoAcao:
          'Implemente prestação de contas trimestral aberta à membresia. Crie um conselho de accountability para o pastor e líderes-chave. Talento promove, mas só caráter sustenta — invista nele acima de tudo.',
        questoes: [
          { id: 'p6_q1', texto: 'Existe transparência total na gestão financeira da nossa igreja.' },
          { id: 'p6_q2', texto: 'O caráter do líder é priorizado acima do seu talento ou carisma.' },
          { id: 'p6_q3', texto: 'Temos mecanismos reais de prestação de contas (accountability).' },
        ],
      },
      {
        numero: 15,
        nome: 'Louvor e Liturgia Viva',
        dominioId: 'espiritualidade',
        planoAcao:
          'Reveja sua liturgia com olhar de visitante: o que confunde? O que distrai? Treine sua equipe de louvor a pastorear, não performar. O culto é encontro, não show — tudo deve facilitar a presença de Deus.',
        questoes: [
          { id: 'p15_q1', texto: 'Nossos cultos facilitam um encontro real com a presença de Deus.' },
          { id: 'p15_q2', texto: 'A liturgia é fluida e facilita a conexão do visitante com a mensagem.' },
          { id: 'p15_q3', texto: 'O louvor é congregacional e focado na exaltação a Cristo.' },
        ],
      },
      {
        numero: 16,
        nome: 'Criatividade e Inovação',
        dominioId: 'espiritualidade',
        planoAcao:
          'Monte um time criativo (mesmo pequeno) com liberdade de propor novas linguagens — vídeo, design, redes, artes cênicas. A mensagem é imutável; a forma precisa falar a língua da geração atual.',
        questoes: [
          { id: 'p16_q1', texto: 'Buscamos novas linguagens para apresentar a mensagem imutável.' },
          { id: 'p16_q2', texto: 'Erros em tentativas de inovação são vistos como aprendizado.' },
          { id: 'p16_q3', texto: 'Investimos em artes e tecnologia para comunicar a visão.' },
        ],
      },
      {
        numero: 17,
        nome: 'Pregação Transformadora',
        dominioId: 'espiritualidade',
        planoAcao:
          'Termine cada mensagem com 1 aplicação clara para a semana. Combine profundidade teológica com aplicação prática. Use recursos visuais, guias de estudo e mídias para que o ensino atravesse o domingo.',
        questoes: [
          { id: 'p17_q1', texto: 'As mensagens do púlpito são práticas e aplicáveis ao dia a dia.' },
          { id: 'p17_q2', texto: 'Há equilíbrio entre ensino teológico e inspiração para a vida.' },
          { id: 'p17_q3', texto: 'O pastor utiliza recursos modernos para fixar o ensino.' },
        ],
      },
    ],
  },
  {
    id: 'comunidade',
    nome: 'Comunidade & Pastoreio',
    subtitulo: 'O cuidado mútuo e a vida em corpo',
    insightBaixo:
      'Pessoas podem estar entrando pela porta da frente e saindo pelos fundos sem serem notadas. Fortaleça os pequenos grupos e o pastoreio mútuo para que cada membro seja cuidado e discipulado de verdade.',
    principios: [
      {
        numero: 9,
        nome: 'Relacionamentos Interpessoais',
        dominioId: 'comunidade',
        planoAcao:
          'Crie espaços intencionais de relacionamento (cafés, grupos, encontros de casais). Treine líderes em mediação bíblica de conflitos. Igreja saudável não é a que não tem conflitos, é a que sabe reconciliá-los.',
        questoes: [
          { id: 'p9_q1', texto: 'Promovemos ambientes onde as pessoas são conhecidas e amadas.' },
          { id: 'p9_q2', texto: 'Conflitos internos são resolvidos com reconciliação bíblica.' },
          { id: 'p9_q3', texto: 'Priorizamos a saúde das famílias e dos casamentos.' },
        ],
      },
      {
        numero: 10,
        nome: 'Comunhão e Pequenos Grupos',
        dominioId: 'comunidade',
        planoAcao:
          'Estabeleça uma meta clara: x% da membresia em pequenos grupos em 12 meses. Forme líderes de grupo com critérios espirituais. Sem pequenos grupos, o cuidado vira fila de espera no gabinete pastoral.',
        questoes: [
          { id: 'p10_q1', texto: 'A maior parte dos membros está conectada em grupos pequenos.' },
          { id: 'p10_q2', texto: 'O pastoreio mútuo acontece de forma orgânica nos relacionamentos.' },
          { id: 'p10_q3', texto: 'Temos um ambiente acolhedor para visitantes em nossos grupos.' },
        ],
      },
      {
        numero: 14,
        nome: 'Discipulado Intencional',
        dominioId: 'comunidade',
        planoAcao:
          'Desenhe uma jornada de discipulado em etapas claras (ex: visitante → membro → discípulo → discipulador). Comunique essa jornada do púlpito. Discipulado não é programa, é cultura — e começa pelo pastor.',
        questoes: [
          { id: 'p14_q1', texto: 'Existe um caminho claro de crescimento espiritual para quem chega.' },
          { id: 'p14_q2', texto: 'O discipulado é um estilo de vida de acompanhamento pessoal.' },
          { id: 'p14_q3', texto: 'Formamos discípulos que têm maturidade para discipular outros.' },
        ],
      },
      {
        numero: 22,
        nome: 'Generosidade e Mordomia',
        dominioId: 'comunidade',
        planoAcao:
          'Ensine sobre mordomia com naturalidade e frequência (não apenas em campanhas). Audite seu orçamento: quanto vai para pessoas e missão vs. estrutura? Generosidade ensinada gera generosidade vivida.',
        questoes: [
          { id: 'p22_q1', texto: 'Ensinamos com frequência sobre fidelidade nos dízimos e ofertas.' },
          { id: 'p22_q2', texto: 'Somos generosos com os necessitados e com a obra missionária.' },
          { id: 'p22_q3', texto: 'Recursos são investidos prioritariamente em pessoas e missão.' },
        ],
      },
      {
        numero: 23,
        nome: 'Cuidado Pastoral',
        dominioId: 'comunidade',
        planoAcao:
          'Estruture uma rede de cuidado: líderes de grupo + diáconos + equipe pastoral. Mapeie as principais dores da sua congregação (luto, divórcio, dependência, finanças) e crie ministérios de apoio para cada uma.',
        questoes: [
          { id: 'p23_q1', texto: 'Temos uma estrutura que garante que ninguém sofra sozinho.' },
          { id: 'p23_q2', texto: 'A equipe de cuidado é acessível nos momentos de crise.' },
          { id: 'p23_q3', texto: 'Existem ministérios para apoiar pessoas em diferentes dores da vida.' },
        ],
      },
    ],
  },
  {
    id: 'missao',
    nome: 'Missão & Relevância',
    subtitulo: 'A igreja para fora das paredes',
    insightBaixo:
      'Sua igreja corre o risco de se tornar um clube fechado. É hora de olhar para fora das paredes. Uma igreja que não é missionária para a sua cidade está apenas se reunindo, não cumprindo o Ide.',
    principios: [
      {
        numero: 8,
        nome: 'Foco no Evangelismo',
        dominioId: 'missao',
        planoAcao:
          'Estabeleça metas claras de evangelismo e batismos. Treine sua membresia para compartilhar o evangelho de forma simples no cotidiano. Celebre cada novo nome — onde há colheita, há semeadura intencional.',
        questoes: [
          { id: 'p8_q1', texto: 'Temos estratégias constantes para alcançar pessoas não religiosas.' },
          { id: 'p8_q2', texto: 'Membros são motivados a compartilhar a fé em seus círculos.' },
          { id: 'p8_q3', texto: 'Batismos e novas conversões são eventos frequentes.' },
        ],
      },
      {
        numero: 11,
        nome: 'Compaixão e Serviço Social',
        dominioId: 'missao',
        planoAcao:
          'Identifique 1 dor real da sua cidade e crie 1 projeto consistente para responder a ela. Mobilize voluntários mensalmente. A pergunta-teste é: se sua igreja fechasse amanhã, a cidade sentiria falta?',
        questoes: [
          { id: 'p11_q1', texto: 'Nossa igreja é relevante para a cidade através de projetos sociais.' },
          { id: 'p11_q2', texto: 'A cidade sentiria falta se a igreja deixasse de existir hoje.' },
          { id: 'p11_q3', texto: 'Mobilizamos voluntários para agir fora das quatro paredes.' },
        ],
      },
      {
        numero: 19,
        nome: 'Multiplicação e Expansão',
        dominioId: 'missao',
        planoAcao:
          'Comece a falar de multiplicação como cultura, não evento. Identifique seu próximo plantador, sua próxima região, seu próximo grupo a multiplicar. Igreja saudável multiplica — é da natureza do Reino.',
        questoes: [
          { id: 'p19_q1', texto: 'Temos o DNA de plantar novas frentes de trabalho regularmente.' },
          { id: 'p19_q2', texto: 'O crescimento numérico é consequência natural da saúde.' },
          { id: 'p19_q3', texto: 'Projetamos o futuro com planos de expansão geográfica.' },
        ],
      },
      {
        numero: 24,
        nome: 'Próxima Geração',
        dominioId: 'missao',
        planoAcao:
          'Audite seu orçamento e sua agenda: quanto da sua atenção e recurso vai para a próxima geração? Dê espaço real (não simbólico) para jovens liderarem. Uma igreja sem jovens é uma igreja sem amanhã.',
        questoes: [
          { id: 'p24_q1', texto: 'Investimos pesadamente em crianças, adolescentes e jovens.' },
          { id: 'p24_q2', texto: 'Damos espaço para os jovens exercerem liderança e darem ideias.' },
          { id: 'p24_q3', texto: 'O ambiente da igreja é atraente para as novas gerações.' },
        ],
      },
      {
        numero: 25,
        nome: 'Cultura de Excelência',
        dominioId: 'missao',
        planoAcao:
          'Excelência não é luxo, é honra. Comece pelo básico: pontualidade, limpeza, comunicação clara, acolhimento na entrada. Cada detalhe comunica como você vê a Deus. O que vale a pena fazer vale a pena fazer bem.',
        questoes: [
          { id: 'p25_q1', texto: 'Buscamos o melhor para Deus em cada detalhe (zelo e ordem).' },
          { id: 'p25_q2', texto: 'Pontualidade e organização são valores respeitados.' },
          { id: 'p25_q3', texto: 'A excelência é vista como forma de honrar a Deus.' },
        ],
      },
    ],
  },
];

export const TODAS_AS_QUESTOES: QuestaoDiagnostico[] = DOMINIOS_DIAGNOSTICO.flatMap((d) =>
  d.principios.flatMap((p) => p.questoes)
);

export const TODOS_OS_PRINCIPIOS: PrincipioDiagnostico[] = DOMINIOS_DIAGNOSTICO.flatMap(
  (d) => d.principios
);

// Fórmulas de Cálculo
export function calcularScorePrincipio(q1: number, q2: number, q3: number): number {
  const sum = (q1 || 1) + (q2 || 1) + (q3 || 1);
  return Math.round(((sum - 3) / 12) * 100);
}

export function calcularResultadosDiagnostico(respostas: Record<string, number>) {
  const principiosResultados = TODOS_OS_PRINCIPIOS.map((p) => {
    const q1 = respostas[p.questoes[0].id] || 1;
    const q2 = respostas[p.questoes[1].id] || 1;
    const q3 = respostas[p.questoes[2].id] || 1;
    const score = calcularScorePrincipio(q1, q2, q3);
    return {
      numero: p.numero,
      nome: p.nome,
      dominioId: p.dominioId,
      score,
      planoAcao: p.planoAcao,
    };
  });

  const dominiosResultados = DOMINIOS_DIAGNOSTICO.map((d) => {
    const princs = principiosResultados.filter((p) => p.dominioId === d.id);
    const sum = princs.reduce((acc, curr) => acc + curr.score, 0);
    const score = Math.round(sum / princs.length);
    return {
      id: d.id,
      nome: d.nome,
      subtitulo: d.subtitulo,
      insightBaixo: d.insightBaixo,
      score,
      principios: princs,
    };
  });

  // Score Global
  const scoreGlobal = Math.round(
    dominiosResultados.reduce((acc, d) => acc + d.score, 0) / dominiosResultados.length
  );

  // Status Geral
  let statusIgreja: { nome: string; descricao: string; cor: string; bg: string; border: string };
  if (scoreGlobal <= 40) {
    statusIgreja = {
      nome: 'Sobrevivência',
      descricao:
        'Igreja em Crise de Fundamentação. O foco urgente deve ser o retorno às raízes bíblicas e a estruturação básica de liderança e oração.',
      cor: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-300',
    };
  } else if (scoreGlobal <= 70) {
    statusIgreja = {
      nome: 'Desenvolvimento',
      descricao:
        'Igreja em Consolidação. Você já possui uma base viva, mas precisa ajustar processos, alinhar liderança e focar no discipulado contínuo para não estagnar.',
      cor: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
    };
  } else {
    statusIgreja = {
      nome: 'Prevalecente',
      descricao:
        'Igreja que Prevalece. Sua igreja é saudável, relevante e influente. O desafio agora é a multiplicação, mentoria de outros pastores e expansão do Reino.',
      cor: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
    };
  }

  // Determinar Modo Operacional
  type ModoDiagnostico = 'legado' | 'recomeco' | 'correcao' | 'ajuste' | 'expansao';
  let modo: ModoDiagnostico = 'ajuste';

  if (scoreGlobal === 100 || dominiosResultados.every((d) => d.score >= 95)) {
    modo = 'legado';
  } else if (scoreGlobal === 0 || dominiosResultados.every((d) => d.score <= 10)) {
    modo = 'recomeco';
  } else if (dominiosResultados.some((d) => d.score < 60)) {
    modo = 'correcao';
  } else if (dominiosResultados.every((d) => d.score >= 75)) {
    modo = 'expansao';
  } else {
    modo = 'ajuste';
  }

  const MENSAGENS_PASTORAIS: Record<
    ModoDiagnostico,
    { titulo: string; abertura: string; encerramento: string }
  > = {
    legado: {
      titulo: 'Legado e Multiplicação',
      abertura:
        'Querido pastor, a graça de Deus tem produzido fruto abundante na sua igreja. Os números que você vê não são motivo de orgulho — são um chamado. O próximo capítulo é multiplicação: deixar legado, mentorear outros pastores e abrir as mãos para que outras igrejas prevaleçam junto com a sua.',
      encerramento:
        'Que o Senhor continue te dando sabedoria para administrar essa graça com mansidão. A colheita é grande, e Deus quer usar a sua casa para levantar outras casas.',
    },
    expansao: {
      titulo: 'Próximos Passos de Expansão',
      abertura:
        'Pastor, há muito a celebrar. A sua igreja está saudável e os fundamentos estão firmes. Este diagnóstico não é um alerta — é um convite a expandir além do bom. Deus quer te levar ao próximo nível de profundidade e alcance.',
      encerramento:
        'Continue caminhando com integridade. O céu se alegra com cada passo de obediência. Que estes próximos meses sejam de expansão com leveza e oração.',
    },
    ajuste: {
      titulo: 'Ajustes Finos e Diferenciais',
      abertura:
        'Pastor, a sua igreja está em um lugar saudável, mas com sinais claros de ajuste fino. Não há crise — há um chamado de Deus à intencionalidade. Reveja os pontos abaixo com calma, em oração e com a sua liderança mais próxima.',
      encerramento:
        'Pequenos ajustes feitos no tempo certo evitam grandes reformas mais à frente. Que o Espírito te dê discernimento para priorizar o que é essencial.',
    },
    correcao: {
      titulo: 'Pontos de Atenção e Diferenciais',
      abertura:
        'Querido pastor, não há condenação aqui — apenas um espelho honesto diante do Senhor. Deus está te convidando a olhar com coragem para alguns pontos da sua igreja. Não carregue isso sozinho: ore, compartilhe com a sua liderança, e dê o primeiro passo.',
      encerramento:
        'Lembre-se: o mesmo Deus que te chamou é o que te capacita. Comece por um princípio, com fé e constância, e veja como Ele restaura o que parece travado.',
    },
    recomeco: {
      titulo: 'Recomeço: Fundamentos Primeiro',
      abertura:
        'Pastor, este é um momento de recomeço. Antes de qualquer estratégia, volte aos fundamentos: a oração, a Palavra, a comunhão genuína. Deus se especializa em começar do zero — e Ele está com você.',
      encerramento:
        'Não tenha pressa de crescer em número. Tenha pressa de crescer em profundidade. O Senhor edifica casa, e o trabalho dos edificadores não será em vão.',
    },
  };

  return {
    scoreGlobal,
    statusIgreja,
    modo,
    mensagens: MENSAGENS_PASTORAIS[modo],
    dominios: dominiosResultados,
    principios: principiosResultados,
  };
}
