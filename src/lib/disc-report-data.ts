import type { DiscLetter, DiscScores } from './disc';
import { DISC_META, type DiscMetaItem } from './disc-meta';

export interface CompoundProfileData {
  code: string;
  title: string;
  subtitle: string;
  generalDescription: string;
  potentialities: string[];
  interpersonalRelationships: {
    workAndService: string;
    familyAndFriends: string;
    underFormalEnvironment: string;
  };
  decisionMaking: string;
  mainMotivator: {
    title: string;
    description: string;
  };
  secondaryMotivator: {
    title: string;
    description: string;
  };
  coreFears: string[];
  bestOrganizationalFit: string[];
  pointsToDevelop: string[];
  pastoralGuidance: string;
}

export interface LeadershipStyleData {
  style: 'Executivo' | 'Motivador' | 'Metódico' | 'Sistemático';
  percentage: number;
  letter: DiscLetter;
  summary: string;
  strengths: string[];
  challenges: string[];
  color: string;
}

export interface DimensionAnalysis {
  letter: DiscLetter;
  name: string;
  title: string; // Ex: "Como lida com Problemas e Desafios"
  score: number;
  percentage: number;
  intensityLevel: 'Muito Alto' | 'Alto' | 'Equilibrado' | 'Baixo' | 'Muito Baixo';
  descriptor: string;
  interpretation: string;
}

export interface CommunicationGuideline {
  targetLetter: DiscLetter;
  targetName: string;
  howToCommunicateDo: string[];
  howToCommunicateDont: string[];
}

export interface CompetencyItem {
  id: string;
  name: string;
  score: number; // 0 a 100
  level: 'Crítico' | 'Baixo' | 'Satisfatório' | 'Desenvolvido' | 'Excelente';
  description: string;
}

export interface FullDiscReport {
  personName: string;
  primary: DiscLetter;
  secondary: DiscLetter | null;
  profileCode: string;
  profileData: CompoundProfileData;
  dimensions: DimensionAnalysis[];
  leadershipStyles: LeadershipStyleData[];
  predominantLeadership: LeadershipStyleData;
  communicationGuide: {
    howOthersShouldTalkToMe: {
      do: string[];
      dont: string[];
    };
    howITalkToOtherProfiles: CommunicationGuideline[];
  };
  competencies: CompetencyItem[];
  reflectionQuestions: string[];
}

// 16 Perfis Comportamentais (4 Puros + 12 Combinados mais expressivos)
export const COMPOUND_PROFILES_CATALOG: Record<string, CompoundProfileData> = {
  // COMBINAÇÕES COM D
  D: {
    code: 'D',
    title: 'Perfil D: O Comandante Direto',
    subtitle: 'Foco total em resultados, pioneirismo, velocidade e superação de obstáculos',
    generalDescription:
      'Pessoas com perfil Dominante puro são movidas por desafios grandiosos e pela conquista de objetivos audaciosos. Encaram a vida de forma assertiva, com pulso firme e postura pioneira. Preferem abrir novos caminhos a manter processos preexistentes, buscando sempre autonomia, rapidez e autoridade para decidir.',
    potentialities: [
      'Iniciativa imediata para dar início a projetos estagnados',
      'Coragem para enfrentar crises e decisões difíceis sem hesitação',
      'Foco inabalável no alcance de metas e resultados mensuráveis',
      'Capacidade de inspirar ação rápida e mover a equipe para frente',
      'Alta tolerância ao risco e gosto genuíno por grandes desafios',
    ],
    interpersonalRelationships: {
      workAndService: 'Muito direto, exigente com entregas e prazos. Pode parecer impositivo quando pressionado por tempo.',
      familyAndFriends: 'Protetor, prático e objetivo na resolução dos problemas do lar.',
      underFormalEnvironment: 'Prefere reuniões objetivas, pautas curtas e prestação de contas com foco em impacto real.',
    },
    decisionMaking: 'Rápida, intuitiva, autônoma e orientada a resultados concretos.',
    mainMotivator: {
      title: 'Realização, Autonomia e Poder',
      description: 'O desejo de vencer desafios, ditar o rumo das ações e ver resultados impactantes construídos com agilidade.',
    },
    secondaryMotivator: {
      title: 'Eficiência e Velocidade',
      description: 'Aversão a enrolação, burocracias lentas e debates sem aplicação prática imediata.',
    },
    coreFears: ['Perder a autonomia e a liberdade de ação', 'Ser controlado ou subordinado de forma autoritária', 'Sentir que está falhando ou perdendo tempo'],
    bestOrganizationalFit: [
      'Implantação de novas frentes ministeriais ou projetos pioneiros',
      'Liderança de projetos especiais e eventos com metas arrojadas',
      'Gestão de crises e coordenação de logística de alta exigência',
    ],
    pointsToDevelop: [
      'Desenvolver paciência ativa com pessoas que possuem um ritmo mais cadenciado',
      'Ouvir opiniões contrárias antes de bater o martelo final',
      'Equilibrar a franqueza com acolhimento para não ferir liderados',
    ],
    pastoralGuidance:
      'Dê-lhe autonomia e objetivos claros, combinando previamente os limites de atuação. Evite microgerenciamento e valorize sua capacidade de destravar frentes complexas.',
  },

  DI: {
    code: 'DI',
    title: 'Perfil DI: O Empreendedor Pioneiro',
    subtitle: 'A combinação do dinamismo de resultados com a paixão por conectar pessoas',
    generalDescription:
      'Combina o foco incisivo em metas da Dominância com a energia contagiante e a expressividade da Influência. É um mobilizador nato: tem facilidade tanto para conceber ideias grandiosas quanto para entusiasmar pessoas a comprarem a visão. Não teme o desconhecido e adora ambientes vibrantes.',
    potentialities: [
      'Excelente capacidade de articulação e convencimento de multidões',
      'Velocidade para transformar conceitos abstratos em iniciativas reais',
      'Entusiasmo magnético que atrai voluntários e parceiros de causa',
      'Visão estratégica focada em crescimento, expansão e multiplicação',
      'Resiliência e otimismo para ultrapassar crises rapidamente',
    ],
    interpersonalRelationships: {
      workAndService: 'Carismático, comunicativo e incisivo. Cobra resultados, mas faz questão de celebrar conquistas em grupo.',
      familyAndFriends: 'Animado, agregador e focado em proporcionar momentos marcantes e novas experiências.',
      underFormalEnvironment: 'Prefere apresentações dinâmicas, debates abertos e formatos criativos de condução.',
    },
    decisionMaking: 'Rápida, intuitiva, otimista e fortemente impulsionada pela visão de futuro.',
    mainMotivator: {
      title: 'Conquista e Influência',
      description: 'Ver suas ideias ganhando vida e impactando muitas vidas com relevância e pioneirismo.',
    },
    secondaryMotivator: {
      title: 'Reconhecimento e Liberdade Criativa',
      description: 'Sentir que tem espaço para ousar, criar e ser valorizado por seu ímpeto.',
    },
    coreFears: ['Rotina monótona e engessada', 'Ser ignorado ou desvalorizado em suas contribuições', 'Perder a liberdade de inovar'],
    bestOrganizationalFit: [
      'Evangelismo, plantação de ministérios e captação de novos voluntários',
      'Coordenação de eventos, juventude e projetos de expansão',
      'Liderança de frentes dinâmicas que precisem de mobilização contínua',
    ],
    pointsToDevelop: [
      'Atenção aos detalhes técnicos e cumprimento de rotinas operacionais chatas',
      'Evitar iniciar muitos projetos antes de consolidar os anteriores',
      'Cuidar para não prometer além do tempo e capacidade disponíveis',
    ],
    pastoralGuidance:
      'Coloque ao lado dele pessoas com perfis S ou C para cuidar da retaguarda, planilhas e detalhes, enquanto ele lidera a visão e o engajamento.',
  },

  DS: {
    code: 'DS',
    title: 'Perfil DS: O Diretor Resoluto',
    subtitle: 'Firmeza de propósito combinada com lealdade e constância',
    generalDescription:
      'Reúne a determinação inabalável da Dominância com a paciência e persistência da Estabilidade. É o perfil que não apenas começa forte, mas tem fôlego para ficar até o fim. Costuma ser um líder sereno, que fala com peso de autoridade e inspira profunda confiança pela consistência de seu testemunho.',
    potentialities: [
      'Liderança consistente e confiável diante de longos projetos',
      'Capacidade de defender causas com firmeza e constância',
      'Grande resistência à fadiga emocional e lealdade à liderança',
      'Habilidade para manter a calma sem perder o foco nos objetivos',
      'Conclusão disciplinada de compromissos assumidos',
    ],
    interpersonalRelationships: {
      workAndService: 'Focado em deveres, ponderado e confiável. Exige respeito aos acordos firmados.',
      familyAndFriends: 'Pilar de sustento emocional, presente e protetor nas horas de dificuldade.',
      underFormalEnvironment: 'Respeita hierarquias e protocolos, mas cobra objetividade e solidez.',
    },
    decisionMaking: 'Firme, pragmática, porém ponderada pela viabilidade prática.',
    mainMotivator: {
      title: 'Resultados Sustentáveis e Lealdade',
      description: 'Construir bases sólidas que permaneçam no tempo e gerem frutos duradouros.',
    },
    secondaryMotivator: {
      title: 'Segurança e Clareza',
      description: 'Saber com quem pode contar e quais são as expectativas reais.',
    },
    coreFears: ['Traição de confiança ou quebra de acordos', 'Mudanças caóticas sem propósito claro', 'Incompetência que ameace o projeto'],
    bestOrganizationalFit: [
      'Gestão de operações ministeriais e manutenção de infraestrutura',
      'Supervisão de GCs, coordenação de equipes de apoio e ação social contínua',
      'Liderança de ministérios maduros que demandem estabilidade e foco',
    ],
    pointsToDevelop: [
      'Evitar rigidez excessiva diante de imprevistos do dia a dia',
      'Flexibilizar seu ritmo quando a situação exigir rápida adaptação',
      'Expressar sentimentos e calor humano de forma mais espontânea',
    ],
    pastoralGuidance:
      'Reconheça sua fidelidade e constância. É um dos pilares mais confiáveis de qualquer liderança pastoral para delegar responsabilidades de longo prazo.',
  },

  DC: {
    code: 'DC',
    title: 'Perfil DC: O Estrategista de Alta Precisão',
    subtitle: 'Audácia para realizar unida à exigência de perfeição técnica e conceitual',
    generalDescription:
      'Uma combinação formidável entre a iniciativa da Dominância e o rigor analítico da Conformidade. É o estrategista: pensa de forma lógica, antecipa falhas antes que aconteçam e não aceita mediocridade. Gosta de desafios complexos que exijam raciocínio afiado, planejamento cirúrgico e execução irretocável.',
    potentialities: [
      'Pensamento crítico excepcional e diagnóstico rápido de vulnerabilidades',
      'Alta qualidade e padrão estético ou técnico em tudo o que produz',
      'Capacidade de desenhar processos eficientes do zero',
      'Autodisciplina férrea e cumprimento rigoroso de metas estabelecidas',
      'Liderança técnica respeitada pelo profundo domínio de conteúdo',
    ],
    interpersonalRelationships: {
      workAndService: 'Muito focado nas tarefas, exigente e formal. Valoriza competência e argumentação embasada.',
      familyAndFriends: 'Reservado, confiável e leal, demonstrando cuidado através de ações práticas e proteção.',
      underFormalEnvironment: 'Altamente preparado, pontual, respaldado em dados e fatos claros.',
    },
    decisionMaking: 'Racional, calculada, baseada em causa e efeito e evidências comprovadas.',
    mainMotivator: {
      title: 'Excelência e Competência',
      description: 'Dominar sua área de atuação e entregar resultados impecáveis que superem as expectativas.',
    },
    secondaryMotivator: {
      title: 'Autonomia e Ordem',
      description: 'Trabalhar com método sem interferências desnecessárias ou despreparo alheio.',
    },
    coreFears: ['Cometer erros grosseiros em público', 'Desorganização e retrabalho causado por terceiros', 'Perder o controle sobre os padrões'],
    bestOrganizationalFit: [
      'Administração eclesiástica, finanças, conselho fiscal e governança',
      'Produção técnica de alto nível (som, vídeo, transmissão, TI da igreja)',
      'Planejamento estratégico de ensino bíblico, currículos e formação teológica',
    ],
    pointsToDevelop: [
      'Aprender a tolerar pequenas imperfeições que não comprometam o Reino',
      'Dosar o tom crítico ao dar feedback para voluntários mais sensíveis',
      'Celebrar pequenos passos antes de focar imediatamente no que ainda falta',
    ],
    pastoralGuidance:
      'Dê-lhe tempo para analisar antes de pedir soluções. Ao delegar, explique o padrão desejado e confie na sua capacidade técnica.',
  },

  // COMBINAÇÕES COM I
  I: {
    code: 'I',
    title: 'Perfil I: O Comunicador Contagiante',
    subtitle: 'Relacionamento, empatia calorosa, expressividade e ambiente acolhedor',
    generalDescription:
      'Pessoas com perfil Influente puro são guiadas pela paixão por seres humanos e pela alegria da comunhão. Irradiam calor, quebram o gelo com naturalidade e têm facilidade para fazer qualquer pessoa nova se sentir em casa. São espontâneas, criativas, otimistas e gostam de ambientes dinâmicos e participativos.',
    potentialities: [
      'Acolhimento natural de novos visitantes e facilidade de entrosamento',
      'Comunicação vibrante, inspiradora e acessível a todos os públicos',
      'Habilidade para amenizar tensões e trazer alegria ao ambiente de serviço',
      'Criatividade fértil para dinâmicas, eventos sociais e momentos de comunhão',
      'Gosto por motivar e encorajar quem está desanimado',
    ],
    interpersonalRelationships: {
      workAndService: 'Amigável, agregador e focado em manter o time animado. Rende muito mais em equipe.',
      familyAndFriends: 'Afetuoso, espontâneo e sempre disposto a conversas, risadas e reuniões familiares.',
      underFormalEnvironment: 'Tende a transformar reuniões rígidas em momentos descontraídos e relacionais.',
    },
    decisionMaking: 'Emocional, rápida, focada no bem-estar das pessoas e no consenso do grupo.',
    mainMotivator: {
      title: 'Conexão e Reconhecimento Social',
      description: 'Sentir-se amado, incluído e perceber que sua presença faz a diferença na vida do próximo.',
    },
    secondaryMotivator: {
      title: 'Ambiente Alegre e Liberdade',
      description: 'Poder expressar sua espontaneidade sem o peso de regras frias ou rigidez excessiva.',
    },
    coreFears: ['Rejeição social e isolamento', 'Perder a aprovação e o afeto das pessoas', 'Ambientes frios, monótonos ou excessivamente críticos'],
    bestOrganizationalFit: [
      'Recepção, acolhimento de visitantes e integração de membros',
      'Animação de eventos, recreação infantil e ministério com jovens',
      'Aconselhamento inicial de primeiros passos e pastoreio relacional',
    ],
    pointsToDevelop: [
      'Fortalecer a pontualidade e o compromisso com prazos pré-acordados',
      'Aprender a dizer não para não sobrecarregar sua agenda pessoal',
      'Manter o foco em tarefas individuais sem se dispersar em conversas',
    ],
    pastoralGuidance:
      'Elogie publicamente seu empenho e acolha suas ideias. Ofereça um checklist simples para ajudá-lo a manter a organização sem matar seu entusiasmo.',
  },

  ID: {
    code: 'ID',
    title: 'Perfil ID: O Motivador Assertivo',
    subtitle: 'Magnetismo relacional com forte impulso de realização e liderança',
    generalDescription:
      'Une a facilidade comunicativa da Influência com a ambição e energia de ação da Dominância. É o perfil do líder inspirador: contagia pelo exemplo, desafia as pessoas a irem além e assume a liderança com sorriso no rosto e firmeza de direção. É ótimo para impulsionar equipes estagnadas rumo a novas metas.',
    potentialities: [
      'Liderança carismática capaz de engajar voluntários em projetos desafiadores',
      'Comunicação assertiva e persuasiva com qualquer tipo de público',
      'Iniciativa para resolver crises relacionais com rapidez',
      'Otimismo inabalável mesmo diante de cenários adversos',
      'Habilidade para negociar recursos e articular parcerias ministeriais',
    ],
    interpersonalRelationships: {
      workAndService: 'Dinâmico, acelerado e desafiador. Gosta de equipes animadas que entreguem resultado.',
      familyAndFriends: 'Entusiasta, protetor e promotor de encontros e celebrações.',
      underFormalEnvironment: 'Muito confiante, articulado e focado em apresentar soluções visionárias.',
    },
    decisionMaking: 'Rápida, participativa, mas assertiva na direção final.',
    mainMotivator: {
      title: 'Mobilização e Impacto Social',
      description: 'Inspirar milhares de pessoas a se moverem por um propósito nobre.',
    },
    secondaryMotivator: {
      title: 'Visibilidade e Desafio',
      description: 'Estar no centro das ações estratégicas e ser referência de liderança.',
    },
    coreFears: ['Fracassar perante o grupo', 'Ficar sem voz ou influência nas decisões', 'Estagnação e perda de dinamismo'],
    bestOrganizationalFit: [
      'Coordenação de Redes (Jovens, Casais, Homens/Mulheres)',
      'Liderança de equipes ministeriais grandes e frentes de expansão',
      'Pastoreio e facilitação de encontros inspiracionais e conferências',
    ],
    pointsToDevelop: [
      'Dedicar tempo para ouvir com paciência os mais calados da equipe',
      'Não atropelar etapas operacionais indispensáveis',
      'Cuidar para não impor suas ideias pelo excesso de carisma e energia',
    ],
    pastoralGuidance:
      'Canalize sua energia em projetos estratégicos com grande visibilidade e coloque coordenadores operacionais detalhistas na equipe para garantir a sustentação.',
  },

  IS: {
    code: 'IS',
    title: 'Perfil IS: O Acolhedor Empático',
    subtitle: 'Comunhão profunda, sensibilidade ao próximo e harmonia relacional',
    generalDescription:
      'Une o calor relacional da Influência com a lealdade e a paciência da Estabilidade. É o perfil mais humano, paciente e empático de todos. Sabe ouvir sem pressa, percebe quando alguém está triste mesmo antes de falarem e faz tudo para preservar a paz e a união no grupo. É amado por todos pela sua doçura e dedicação.',
    potentialities: [
      'Sensibilidade aguçada para o cuidado de almas feridas e necessitadas',
      'Poder de conciliação e mediação pacífica de desentendimentos na igreja',
      'Constância no relacionamento pessoal e mentoria um a um',
      'Ambiente hospitaleiro, caloroso e seguro onde ninguém se sente julgado',
      'Generosidade natural para servir e apoiar quem precisa de ajuda',
    ],
    interpersonalRelationships: {
      workAndService: 'Super colaborativo, prestativo e cordial. Foge de conflitos e valoriza a camaradagem.',
      familyAndFriends: 'Coração da família: acolhe, escuta, perdoa e promove a união amorosa.',
      underFormalEnvironment: 'Discreto, respeitoso e focado em garantir que todos se sintam bem.',
    },
    decisionMaking: 'Consensual, empática, ponderando sempre o impacto na vida das pessoas.',
    mainMotivator: {
      title: 'Harmonia e Amor Fraterno',
      description: 'Ver a equipe unida, em paz e as pessoas crescendo e sendo curadas.',
    },
    secondaryMotivator: {
      title: 'Reconhecimento Afeituoso',
      description: 'Sentir que seu carinho e dedicação são correspondidos e valorizados.',
    },
    coreFears: ['Conflitos agressivos e rompimento de laços', 'Ser obrigado a agir com frieza ou dureza', 'Sentir que magoou alguém'],
    bestOrganizationalFit: [
      'Pastoreio de Pequenos Grupos (GCs) e discipulado pessoal',
      'Ministério de Ação Social, Visitação em Hospitais e Lares',
      'Acolhimento no pós-culto, consolidação e aconselhamento de membros',
    ],
    pointsToDevelop: [
      'Aprender a confrontar com amor quando houver pecado ou negligência na equipe',
      'Não tomar as dores dos outros para si a ponto de se esgotar emocionalmente',
      'Tomar decisões firmes mesmo que desagradem temporariamente a alguns',
    ],
    pastoralGuidance:
      'Proteja-o contra sobrecarga emocional. Reconheça seu coração pastoral e ajude-o a colocar limites saudáveis para não absorver os problemas de todos.',
  },

  IC: {
    code: 'IC',
    title: 'Perfil IC: O Comunicador Técnico e Criativo',
    subtitle: 'Expressividade aliada a bom gosto estético, critério e inteligência conceitual',
    generalDescription:
      'Uma combinação inteligente entre o carisma da Influência e a precisão da Conformidade. Consegue explicar ideias complexas de forma elegante, clara e atraente. Gosta de produzir conteúdos de alto padrão visual e conceitual, unindo empatia e credibilidade técnica em cada entrega.',
    potentialities: [
      'Comunicação persuasiva com alto embasamento e rigor conceitual',
      'Excelente senso estético, criatividade com método e bom gosto',
      'Didática paciente para ensinar conceitos técnicos ou teológicos',
      'Capacidade de criar materiais, apresentações e guias de excelência',
      'Equilíbrio entre calor humano e respeito às regras da casa',
    ],
    interpersonalRelationships: {
      workAndService: 'Polido, agradável e criterioso. Valoriza conversas inteligentes e projetos bem feitos.',
      familyAndFriends: 'Atencioso, conselheiro respeitado e apreciador de boas conversas profundas.',
      underFormalEnvironment: 'Apresenta-se impecavelmente, com dados organizados e postura profissional.',
    },
    decisionMaking: 'Ponderada, analítica, porém sensível ao impacto visual e relacional.',
    mainMotivator: {
      title: 'Credibilidade e Expressão com Excelência',
      description: 'Ser reconhecido pela inteligência, qualidade e clareza de suas comunicações.',
    },
    secondaryMotivator: {
      title: 'Cooperação com Padrão',
      description: 'Trabalhar com pessoas competentes em projetos elegantes e relevantes.',
    },
    coreFears: ['Passar vergonha com erros técnicos públicos', 'Críticas ao seu profissionalismo', 'Ambientes desleixados e grosseiros'],
    bestOrganizationalFit: [
      'Comunicação, mídias sociais, design gráfico e branding da igreja',
      'Ensino bíblico de excelência, preparação de estudos e manuais',
      'Assessoria pastoral, curadoria de eventos e produção de conteúdo',
    ],
    pointsToDevelop: [
      'Não se paralisar pelo excesso de perfeccionismo estético',
      'Lançar versões boas a tempo em vez de esperar a perfeição inalcançável',
      'Lidar melhor com feedbacks diretos e cobranças de urgência',
    ],
    pastoralGuidance:
      'Forneça diretrizes claras de qualidade e confie em seu talento criativo. Estabeleça prazos intermediários para evitar revisões infinitas.',
  },

  // COMBINAÇÕES COM S
  S: {
    code: 'S',
    title: 'Perfil S: O Pacificador Constante',
    subtitle: 'Paciência, lealdade inegociável, serenidade e perseverança na rotina',
    generalDescription:
      'Pessoas com perfil Estável puro são o alicerce silencioso de sustentação de qualquer ministério. Têm um ritmo cadenciado, odeiam conflitos e são especialistas em acolher, apoiar e manter a ordem contínua. Não buscam holofotes, mas são aquelas com quem todos sabem que podem contar nos bastidores sem falhar.',
    potentialities: [
      'Fidelidade inabalável a compromissos e horários ao longo dos anos',
      'Paciência profunda para lidar com pessoas difíceis e processos lentos',
      'Habilidade para executar rotinas com constância e sem reclamações',
      'Capacidade de ouvir com atenção e acalmar ânimos acirrados',
      'Excelente cooperação em equipe e suporte leal aos líderes',
    ],
    interpersonalRelationships: {
      workAndService: 'Calmo, pontual e muito solícito. Evita atritos e cumpre o dever com discrição.',
      familyAndFriends: 'Amigo para a vida toda, confiável, guardião de segredos e porto seguro.',
      underFormalEnvironment: 'Discreto, respeitoso com normas e focado em manter o ambiente sereno.',
    },
    decisionMaking: 'Reflexiva, segura, ponderada e gradual. Prefere não se precipitar.',
    mainMotivator: {
      title: 'Segurança, Harmonia e Estabilidade',
      description: 'Viver em um ambiente tranquilo, previsível, com laços sinceros e sem surpresas desagradáveis.',
    },
    secondaryMotivator: {
      title: 'Apoio e Cooperação Sincera',
      description: 'Sentir que seu trabalho de bastidores é útil e alivia o fardo de quem ele ama.',
    },
    coreFears: ['Mudanças bruscas e repentinas', 'Confrontos hostis e ameaça de demissão/afastamento', 'Insegurança em seu ambiente seguro'],
    bestOrganizationalFit: [
      'Secretaria eclesiástica, controle de membros e rotinas pastorais',
      'Intercessão contínua, aconselhamento paciente e acompanhamento',
      'Ministério com Crianças (paciência e zelo) e apoio logístico contínuo',
    ],
    pointsToDevelop: [
      'Aprender a verbalizar suas opiniões e insatisfações antes de acumular mágoa',
      'Superar o medo de mudanças quando forem para o crescimento do Reino',
      'Desenvolver agilidade para lidar com imprevistos inevitáveis',
    ],
    pastoralGuidance:
      'Avise sobre mudanças com antecedência. Evite pressioná-lo a tomar decisões no calor do momento e valorize publicamente sua lealdade inestimável.',
  },

  SD: {
    code: 'SD',
    title: 'Perfil SD: O Realizador Metódico',
    subtitle: 'Combinação rara e equilibrada: a serenidade do servo com a firmeza do líder',
    generalDescription:
      'Um perfil raríssimo e altamente valioso por combinar fatores aparentemente opostos: a Estabilidade com a Dominância. É uma pessoa pacífica e ponderada, que se preocupa genuinamente com as pessoas e busca a harmonia, mas que possui iniciativa própria, senso de dever firme e capacidade de ir até o fim para alcançar resultados. É o líder que governa pela calma e pela consistência.',
    potentialities: [
      'Facilidade singular para planejamento estruturado e execução metódica até a conclusão',
      'Liderança servidora equilibrada: firme nas metas, porém cordial no trato',
      'Persistência e disciplina: não abandona o barco em tempos de crise',
      'Clareza para delegar tarefas definindo orientações precisas e respeitando pessoas',
      'Racionalidade para tomar decisões avaliando o todo com sobriedade e justiça',
    ],
    interpersonalRelationships: {
      workAndService: 'Exigente com a qualidade e prazos, mas amigável e respeitoso. Cumpre rigorosamente o que foi planejado.',
      familyAndFriends: 'Leal, equilibrado, excelente conselheiro familiar e protetor seguro do lar.',
      underFormalEnvironment: 'Postura séria, controlada e formal. Pode parecer rígido para quem não o conhece bem.',
    },
    decisionMaking: 'Reflexiva, racional, completa e profunda. Uma vez decidido pelo plano, segue com convicção firme.',
    mainMotivator: {
      title: 'Segurança e Estabilidade',
      description: 'Reger-se por um sistema de vida sólido, ético e previsível, zelando pela integridade de sua família e trabalho.',
    },
    secondaryMotivator: {
      title: 'Realização e Propósito',
      description: 'Cumprir seu propósito com maestria, assumir responsabilidades de impacto e construir um legado consistente.',
    },
    coreFears: ['Insegurança e instabilidade de longo prazo', 'Perder o autocontrole ou falhar em suas responsabilidades', 'Ter que improvisar sem qualquer planejamento'],
    bestOrganizationalFit: [
      'Supervisão e Liderança de GCs (Pequenos Grupos)',
      'Gestão estratégica de voluntários, escalas e infraestrutura',
      'Diretoria executiva de ministérios e coordenação pastoral de suporte',
    ],
    pointsToDevelop: [
      'Cuidar para que a postura formal e enérgica não transmita rigidez excessiva aos novos',
      'Aceitar que nem todos têm seu nível de persistência e responsabilidade',
      'Aumentar a flexibilidade diante de mudanças dinâmicas na programação',
    ],
    pastoralGuidance:
      'É um dos braços direitos mais sólidos para um pastor sênior. Dê orientações claras, confie no seu planejamento e peça seus relatórios metódicos.',
  },

  SI: {
    code: 'SI',
    title: 'Perfil SI: O Cooperador Acolhedor',
    subtitle: 'Comunhão paciente, fidelidade e acolhimento focado nas necessidades do outro',
    generalDescription:
      'Combina a lealdade e serenidade da Estabilidade com a simpatia e sociabilidade da Influência. É o voluntário dos sonhos para qualquer equipe ministerial: nunca cria atritos, ajuda em tudo com um sorriso e faz qualquer pessoa se sentir querida. Sabe trabalhar em grupo com harmonia perfeita.',
    potentialities: [
      'Espírito de cooperação voluntária e prontidão para servir aos irmãos',
      'Excelente escuta ativa e carinho no atendimento a visitantes e membros',
      'Manutenção de relacionamentos de longo prazo com lealdade',
      'Ambiente pacífico e livre de fofocas ou disputas de poder',
      'Paciência para ensinar e capacitar novos voluntários com carinho',
    ],
    interpersonalRelationships: {
      workAndService: 'Gentil, participativo, confiável e sempre pronto a ajudar a cobrir escalas.',
      familyAndFriends: 'Dedicação total ao bem-estar familiar, carinhoso e sempre presente.',
      underFormalEnvironment: 'Educado, calmo, focado em contribuir para o bom clima do grupo.',
    },
    decisionMaking: 'Pensada, orientada a pessoas e pautada no bem comum de todos.',
    mainMotivator: {
      title: 'Pertencimento e Apoio Fraterno',
      description: 'Sentir-se útil em uma comunidade de fé saudável, onde reine o amor e o respeito.',
    },
    secondaryMotivator: {
      title: 'Paz e Estabilidade',
      description: 'Rotinas tranquilas e relações transparentes sem sobressaltos.',
    },
    coreFears: ['Rejeição ou exclusão do grupo', 'Ambientes de competição agressiva', 'Sobrecarga sem apoio dos companheiros'],
    bestOrganizationalFit: [
      'Acolhimento de membros, equipe de recepção e berçário/kids',
      'Ministério de Misericórdia, apoio aos idosos e visitação',
      'Equipe de boas-vindas e integração de novos convertidos',
    ],
    pointsToDevelop: [
      'Aprender a se posicionar com firmeza quando discordar de algo',
      'Não adiar tarefas difíceis por medo de gerar desconforto',
      'Assumir a liderança formal quando Deus o convocar para dar um passo à frente',
    ],
    pastoralGuidance:
      'Trate-o com carinho e gentileza. Dê suporte quando precisar tomar decisões difíceis e nunca o deixe sentir que seu serviço silencioso é invisível.',
  },

  SC: {
    code: 'SC',
    title: 'Perfil SC: O Especialista Confiável',
    subtitle: 'Método, lealdade profunda, organização meticulosa e discrição absoluta',
    generalDescription:
      'Reúne a paciência e persistência da Estabilidade com o apreço pela qualidade e conformidade da Conformidade. É o profissional metódico: estuda o processo a fundo, cumpre as regras com zelo e garante que tudo funcione sem nenhum ruído. É discreto, pontual, ético e avesso a atalhos duvidosos.',
    potentialities: [
      'Atenção meticulosa a normas, segurança, relatórios e processos',
      'Constância de entrega no mais alto padrão de qualidade',
      'Discrição absoluta com assuntos sigilosos e confidenciais da igreja',
      'Organização impecável de arquivos, materiais e cronogramas',
      'Paciência de ferro para tarefas que exigiriam desistência da maioria',
    ],
    interpersonalRelationships: {
      workAndService: 'Pontual, focado, reservado e extremamente ético. Cobra seriedade nos processos.',
      familyAndFriends: 'Leal, cuidadoso com a segurança da família e protetor prudente.',
      underFormalEnvironment: 'Respeita rigorosamente a liturgia, as normas e as diretrizes superiores.',
    },
    decisionMaking: 'Lenta, segura, fundamentada em dados, precedentes e normas claras.',
    mainMotivator: {
      title: 'Ordem, Precisão e Segurança',
      description: 'Fazer o que é certo com perfeição, sem expor a igreja ou as pessoas a riscos.',
    },
    secondaryMotivator: {
      title: 'Paz e Consistência',
      description: 'Trabalhar em um ambiente previsível, organizado e com regras claras.',
    },
    coreFears: ['Desordem generalizada e quebra de regras', 'Ter que tomar decisões sob pressão e sem dados', 'Erros graves de conformidade'],
    bestOrganizationalFit: [
      'Secretaria geral, controle patrimonial, compliance e tesouraria',
      'Operação técnica de áudio, iluminação e transmissão (com checklists)',
      'Gestão de banco de dados de membros, relatórios e arquivos ministeriais',
    ],
    pointsToDevelop: [
      'Ter mais flexibilidade para lidar com alterações de última hora no culto',
      'Não se fechar excessivamente na formalidade perante pessoas novas',
      'Compreender que as pessoas são mais importantes que os processos',
    ],
    pastoralGuidance:
      'Ofereça diretrizes escritas e valorize sua precisão cirúrgica. Ao propor mudanças, explique o porquê lógico e dê tempo para ele se adaptar.',
  },

  // COMBINAÇÕES COM C
  C: {
    code: 'C',
    title: 'Perfil C: O Analista Criterioso',
    subtitle: 'Precisão, excelência técnica, busca pela verdade e zelo aos detalhes',
    generalDescription:
      'Pessoas com perfil Conforme puro são apaixonadas pela verdade, pela lógica e pela excelência. Analisam cada detalhe com profundidade, checam dados antes de afirmar e não se contentam com o superficial. São pensadores criteriosos que blindam a igreja contra erros teológicos, legais ou operacionais.',
    potentialities: [
      'Capacidade analítica superior para diagnosticar falhas de processo',
      'Zelo doutrinário e fidelidade à Palavra de Deus e às Escrituras',
      'Rigor técnico na execução de atividades complexas',
      'Planejamento prévio detalhado com mapeamento de contingências',
      'Autodisciplina para estudar e dominar ferramentas difíceis',
    ],
    interpersonalRelationships: {
      workAndService: 'Formal, detalhista e focado na tarefa. Prefere comunicação escrita e documentada.',
      familyAndFriends: 'Reservado, sincero e dedicado a garantir estabilidade e proteção ao lar.',
      underFormalEnvironment: 'Muito sério, ponderado e focado na objetividade e nas evidências.',
    },
    decisionMaking: 'Racional, criteriosa, fundamentada em dados e fatos comprovados.',
    mainMotivator: {
      title: 'Verdade, Exatidão e Qualidade',
      description: 'Ter certeza de que as coisas estão corretas, alinhadas e com padrão irrepreensível.',
    },
    secondaryMotivator: {
      title: 'Autonomia Técnica',
      description: 'Ter espaço para analisar e produzir sem interferências levianas ou apressadas.',
    },
    coreFears: ['Cometer erros grosseiros', 'Críticas injustas ao seu trabalho', 'Trabalhar em ambientes caóticos e indisciplinados'],
    bestOrganizationalFit: [
      'Auditoria de contas, finanças, compras e patrimônio',
      'Ensino bíblico avançado, pesquisa teológica e produção curricular',
      'Engenharia de som, transmissão digital e sistemas de informação',
    ],
    pointsToDevelop: [
      'Superar a "paralisia por análise": decidir no tempo certo mesmo sem 100% dos dados',
      'Acolher com mais calor humano quem ainda não domina os processos',
      'Entender que o Reino opera pela graça e paciência com a imperfeição humana',
    ],
    pastoralGuidance:
      'Apresente dados, fatos e motivos claros ao conversar. Evite cobranças emotivas e permita que ele revise materiais com a devida antecedência.',
  },

  CD: {
    code: 'CD',
    title: 'Perfil CD: O Avaliador Crítico',
    subtitle: 'Raciocínio afiado, padrão inegociável e coragem para apontar melhorias',
    generalDescription:
      'Reúne o critério minucioso da Conformidade com a ousadia e iniciativa da Dominância. É o perfil que encontra a falha em qualquer projeto e não hesita em corrigi-la. Tem mente lógica, direta e orientada para a eficiência: identifica desperdícios, reorganiza fluxos e impõe padrões de alto rendimento.',
    potentialities: [
      'Diagnóstico clínico de problemas operacionais e teológicos',
      'Coragem para confrontar erros e desvios de rota com argumentos sólidos',
      'Eficiência prática aliada ao rigor técnico e legal',
      'Capacidade de reestruturar departamentos que estejam operando com prejuízo',
      'Foco implacável na melhoria contínua de padrões',
    ],
    interpersonalRelationships: {
      workAndService: 'Incansável, direto, exigente e pouco afeito a desculpas. Cobra resultados com qualidade.',
      familyAndFriends: 'Provedor diligente, protetor zeloso e orientador firme dos princípios familiares.',
      underFormalEnvironment: 'Muito seguro, incisivo e embasado em regras e estatísticas.',
    },
    decisionMaking: 'Rápida, lógica, focada no custo-benefício e no longo prazo.',
    mainMotivator: {
      title: 'Eficiência e Competência Cirúrgica',
      description: 'Eliminar desperdícios, falhas e alcançar a máxima produtividade com perfeição.',
    },
    secondaryMotivator: {
      title: 'Resultados e Controle de Qualidade',
      description: 'Garantir que os padrões estabelecidos sejam rigorosamente cumpridos por todos.',
    },
    coreFears: ['Incompetência tolerada', 'Falta de disciplina e desperdício de recursos', 'Ser forçado a engolir padrões baixos'],
    bestOrganizationalFit: [
      'Gestão de contratos, tesouraria e governança ministerial',
      'Coordenação de operações complexas e infraestrutura predial',
      'Comissão teológica de ensino e revisão de doutrinas',
    ],
    pointsToDevelop: [
      'Desenvolver empatia para não intimidar liderados mais frágeis',
      'Compreender que as pessoas se motivam mais por amor do que por cobrança',
      'Elogiar o esforço sincero mesmo quando o resultado ainda não estiver 100%',
    ],
    pastoralGuidance:
      'Aproveite sua lucidez crítica para revisar projetos importantes antes do lançamento. Lembre-o com carinho pastoral de temperar a verdade com a graça.',
  },

  CI: {
    code: 'CI',
    title: 'Perfil CI: O Mediador Lógico',
    subtitle: 'Argumentação lúcida, inteligência relacional e didática estruturada',
    generalDescription:
      'Combina o embasamento sólido da Conformidade com a simpatia e capacidade de articulação da Influência. Consegue traduzir regras, teologia ou procedimentos difíceis para a linguagem comum de forma atraente e paciente. É excelente para tirar dúvidas, instruir liderados e pacificar debates com fatos e cordialidade.',
    potentialities: [
      'Comunicação fundamentada com clareza didática e empatia',
      'Habilidade para mediar debates teológicos ou práticos com elegância',
      'Criação de materiais pedagógicos atrativos e fiéis à Palavra',
      'Simpatia unida a credibilidade técnica e ética',
      'Capacidade de atrair pessoas para processos de capacitação contínua',
    ],
    interpersonalRelationships: {
      workAndService: 'Agradável, educado, detalhista e sempre pronto a ensinar com paciência.',
      familyAndFriends: 'Estimula conversas inteligentes, passeios culturais e ambiente equilibrado.',
      underFormalEnvironment: 'Apresenta relatórios claros, bem diagramados e fáceis de assimilar.',
    },
    decisionMaking: 'Sensata, fundamentada em normas e apresentada com diplomacia.',
    mainMotivator: {
      title: 'Conhecimento Compartilhado e Clareza',
      description: 'Fazer com que a verdade e os processos sejam compreendidos e aplicados por todos.',
    },
    secondaryMotivator: {
      title: 'Harmonia com Padrão',
      description: 'Viver em um ambiente agradável onde as coisas funcionem como devem funcionar.',
    },
    coreFears: ['Desinformação e ignorância que gerem confusão', 'Ser visto como despreparado', 'Grosserias e desrespeito mútuo'],
    bestOrganizationalFit: [
      'Coordenação pedagógica da EBD, Molde de Servo e Escola Bíblica',
      'Treinamento e integração de equipes de voluntários',
      'Comunicação de regras, segurança e ouvidoria ministerial',
    ],
    pointsToDevelop: [
      'Evitar o excesso de explicações quando a situação pedir ação rápida',
      'Tomar posição clara mesmo que gere divergências de opinião',
      'Não se sentir ofendido quando seus conselhos lógicos forem ignorados',
    ],
    pastoralGuidance:
      'Confie a ele a elaboração de materiais de treinamento e manuais de voluntariado. Ele garante que a mensagem chegue correta e compreensível a todos.',
  },

  CS: {
    code: 'CS',
    title: 'Perfil CS: O Guardião Fiel',
    subtitle: 'Rigor ético, discrição incondicional, consistência e confiabilidade absoluta',
    generalDescription:
      'Uma união entre o respeito às regras da Conformidade e a constância e paciência da Estabilidade. É o guardião silencioso da ordem e dos princípios da igreja. Nunca busca aplausos ou visibilidade, mas cumpre cada vírgula do que foi acordado com lealdade inabalável ao longo de anos. É o suporte moral e operacional em quem o pastor pode confiar de olhos fechados.',
    potentialities: [
      'Confiabilidade e fidelidade inegociáveis em todos os processos',
      'Atenção minuciosa para que nenhum detalhe seja esquecido ou negligenciado',
      'Sigilo absoluto diante de questões delicadas e pastorais',
      'Paciência para manter o padrão sem oscilações ao longo do tempo',
      'Construção de rotinas organizadas que trazem paz a toda a equipe',
    ],
    interpersonalRelationships: {
      workAndService: 'Discreto, focado, educado e avesso a fofocas ou conflitos. Fala pouco e entrega muito.',
      familyAndFriends: 'Dedicado, pacífico, mantenedor fiel das tradições e valores do lar.',
      underFormalEnvironment: 'Seguidor exemplar de diretrizes, formal e pontualíssimo.',
    },
    decisionMaking: 'Cuidadosa, cautelosa, baseada em precedentes e normas estabelecidas.',
    mainMotivator: {
      title: 'Tradição, Princípios e Segurança',
      description: 'Zelar pelos fundamentos, proteger a igreja contra desvios e garantir paz duradoura.',
    },
    secondaryMotivator: {
      title: 'Estabilidade e Retidão',
      description: 'Saber que está fazendo o que é correto e justo perante Deus e a liderança.',
    },
    coreFears: ['Incerteza, improvisações arriscadas e quebra de princípios morais', 'Instabilidade no ministério', 'Ser exposto a conflitos públicos'],
    bestOrganizationalFit: [
      'Secretaria Executiva Pastoral, atas e registros de membros',
      'Tesouraria, contabilidade e auditoria financeira interna',
      'Coordenação de bastidores de culto (Santa Ceia, Batismo, Intercessão secreta)',
    ],
    pointsToDevelop: [
      'Permitir-se ousar e inovar quando Deus abrir novas portas para a igreja',
      'Não ver toda mudança como uma ameaça à ordem',
      'Expressar suas necessidades e sentimentos aos companheiros de caminhada',
    ],
    pastoralGuidance:
      'Trate-o com profundo respeito e valorize sua integridade. É um dos bens mais preciosos da igreja para guardar a santidade e a ordem dos bastidores.',
  },
};

// Análise por Dimensão do Marston
export function getDimensionAnalysis(letter: DiscLetter, score: number): DimensionAnalysis {
  const meta = DISC_META[letter];
  const maxScore = 48; // máximo teórico nos 120 pontos
  const pct = Math.min(100, Math.round((score / maxScore) * 100));

  let intensityLevel: DimensionAnalysis['intensityLevel'] = 'Equilibrado';
  let descriptor = '';
  let interpretation = '';

  if (pct >= 75) {
    intensityLevel = 'Muito Alto';
  } else if (pct >= 60) {
    intensityLevel = 'Alto';
  } else if (pct >= 40) {
    intensityLevel = 'Equilibrado';
  } else if (pct >= 25) {
    intensityLevel = 'Baixo';
  } else {
    intensityLevel = 'Muito Baixo';
  }

  switch (letter) {
    case 'D':
      if (pct >= 60) {
        descriptor = 'Diretor / Comandante Audacioso';
        interpretation =
          'Enfrenta problemas e desafios de forma direta, rápida e competitiva. Foco elevado em metas e superação de obstáculos.';
      } else if (pct >= 40) {
        descriptor = 'Resoluto Ponderado';
        interpretation =
          'Age com firmeza quando necessário, mas pondera riscos e busca consenso antes de agir por impulso.';
      } else {
        descriptor = 'Cooperador / Pacificador';
        interpretation =
          'Prefere evitar confrontos diretos, atuando de maneira mais conciliadora, paciente e avessa a disputas de poder.';
      }
      return {
        letter: 'D',
        name: 'Dominância',
        title: 'Como Lida com Problemas e Desafios',
        score,
        percentage: pct,
        intensityLevel,
        descriptor,
        interpretation,
      };

    case 'I':
      if (pct >= 60) {
        descriptor = 'Comunicador / Entusiasmado';
        interpretation =
          'Gosta de influenciar através da palavra, do carisma e do otimismo. Muito expressivo, caloroso e voltado às pessoas.';
      } else if (pct >= 40) {
        descriptor = 'Sociável Consciente';
        interpretation =
          'Comunica-se bem em equipe, porém sabe ouvir e reservar-se quando a situação exige concentração.';
      } else {
        descriptor = 'Pesquisador / Reservado';
        interpretation =
          'Mais introspectivo e analítico; prefere pensar e observar a fundo antes de se expressar publicamente.';
      }
      return {
        letter: 'I',
        name: 'Influência',
        title: 'Como Lida com Pessoas e as Influencia',
        score,
        percentage: pct,
        intensityLevel,
        descriptor,
        interpretation,
      };

    case 'S':
      if (pct >= 60) {
        descriptor = 'Planejador / Metódico Constante';
        interpretation =
          'Dita um ritmo firme, calmo e previsível. Aprecia rotinas bem estabelecidas, métodos claros e lealdade nas relações.';
      } else if (pct >= 40) {
        descriptor = 'Estável Flexível';
        interpretation =
          'Mantém boa constância nas tarefas, mas adapta-se bem quando as circunstâncias exigem mudança de ritmo.';
      } else {
        descriptor = 'Dinâmico / Acelerado';
        interpretation =
          'Gosta de variedade e dinamismo; entedia-se facilmente com tarefas repetitivas e prefere mudanças ágeis.';
      }
      return {
        letter: 'S',
        name: 'Estabilidade',
        title: 'Como Dita o Ritmo e a Consistência',
        score,
        percentage: pct,
        intensityLevel,
        descriptor,
        interpretation,
      };

    case 'C':
      if (pct >= 60) {
        descriptor = 'Analista / Detalhista Criterioso';
        interpretation =
          'Lida com regras e procedimentos com alto nível de exigência e perfeccionismo. Busca precisão, lógica e dados concretos.';
      } else if (pct >= 40) {
        descriptor = 'Organizado Prático';
        interpretation =
          'Respeita normas e processos indispensáveis, mantendo bom senso sem se prender excessivamente à burocracia.';
      } else {
        descriptor = 'Criativo / Informal';
        interpretation =
          'Prefere liberdade de ação e flexibilidade; sente-se sufocado por processos rígidos e controles minuciosos.';
      }
      return {
        letter: 'C',
        name: 'Conformidade',
        title: 'Como Lida com Regras e Procedimentos',
        score,
        percentage: pct,
        intensityLevel,
        descriptor,
        interpretation,
      };
  }
}

// Cálculo dos 4 Estilos de Liderança (Executivo, Motivador, Metódico, Sistemático)
export function calculateLeadershipStyles(scores: DiscScores): {
  styles: LeadershipStyleData[];
  predominant: LeadershipStyleData;
} {
  const total = (scores.D || 0) + (scores.I || 0) + (scores.S || 0) + (scores.C || 0) || 120;

  const styles: LeadershipStyleData[] = [
    {
      style: 'Executivo',
      letter: 'D',
      percentage: Math.round(((scores.D || 0) / total) * 100),
      summary: 'Líder focado em comando, ação rápida, superação de metas e tomada de decisões sob pressão.',
      strengths: ['Agilidade decisória', 'Foco implacável em resultados', 'Coragem para liderar na crise'],
      challenges: ['Impaciência com processos lentos', 'Risco de centralização autoritária'],
      color: '#EF4444',
    },
    {
      style: 'Motivador',
      letter: 'I',
      percentage: Math.round(((scores.I || 0) / total) * 100),
      summary: 'Líder carismático que inspira pelo diálogo, constrói pontes e mobiliza pessoas com entusiasmo.',
      strengths: ['Engajamento contagiante', 'Empatia relacional', 'Comunicação vibrante'],
      challenges: ['Dificuldade para confrontar e cobrar', 'Dispersão em detalhes operacionais'],
      color: '#F59E0B',
    },
    {
      style: 'Metódico',
      letter: 'S',
      percentage: Math.round(((scores.S || 0) / total) * 100),
      summary: 'Líder conciliador, que orienta com paciência, valoriza o consenso e preserva a harmonia da equipe.',
      strengths: ['Escuta paciente e aconselhamento', 'Constância no acompanhamento', 'Lealdade e ambiente pacífico'],
      challenges: ['Hesitação em decisões rápidas', 'Resistência a mudar rotinas consolidadas'],
      color: '#10B981',
    },
    {
      style: 'Sistemático',
      letter: 'C',
      percentage: Math.round(((scores.C || 0) / total) * 100),
      summary: 'Líder perfeccionista, focado na excelência técnica, clareza de processos e padrões de qualidade.',
      strengths: ['Rigor conceitual e ético', 'Planejamento minucioso', 'Controle eficiente de falhas'],
      challenges: ['Excesso de cobrança crítica', 'Paralisia por excesso de análise'],
      color: '#3B82F6',
    },
  ];

  // Ordena decrescente por percentual para achar o predominante
  const sorted = [...styles].sort((a, b) => b.percentage - a.percentage);
  return { styles, predominant: sorted[0] };
}

// 16 Competências Comportamentais (Mapeamento do CIS Assessment)
export function calculateCompetencies(scores: DiscScores): CompetencyItem[] {
  const norm = (val: number, max: number = 40) => Math.min(100, Math.max(10, Math.round((val / max) * 100)));

  const d = scores.D || 0;
  const i = scores.I || 0;
  const s = scores.S || 0;
  const c = scores.C || 0;

  const getLevel = (score: number): CompetencyItem['level'] => {
    if (score >= 80) return 'Excelente';
    if (score >= 65) return 'Desenvolvido';
    if (score >= 45) return 'Satisfatório';
    if (score >= 30) return 'Baixo';
    return 'Crítico';
  };

  const rawList: { id: string; name: string; score: number; description: string }[] = [
    {
      id: 'ousadia',
      name: 'Ousadia',
      score: norm(d * 0.9 + i * 0.2),
      description: 'Ímpeto para agir em busca de objetivos e encarar acontecimentos como desafios estimulantes.',
    },
    {
      id: 'comando',
      name: 'Comando',
      score: norm(d * 1.0 + c * 0.1),
      description: 'Predisposição para assumir a liderança das situações e direcionar a equipe.',
    },
    {
      id: 'objetividade',
      name: 'Objetividade',
      score: norm(d * 0.8 + c * 0.3),
      description: 'Capacidade de ser direto, focado em metas e reagir com rapidez a novos cenários.',
    },
    {
      id: 'assertividade',
      name: 'Assertividade',
      score: norm(d * 0.6 + c * 0.5),
      description: 'Ação com exatidão e firmeza, expressando convicções sem hesitação.',
    },
    {
      id: 'persuasao',
      name: 'Persuasão',
      score: norm(i * 1.0 + d * 0.2),
      description: 'Capacidade de influenciar a tomada de decisão alheia com entusiasmo e visão.',
    },
    {
      id: 'extroversao',
      name: 'Extroversão',
      score: norm(i * 1.0),
      description: 'Energia orientada para fora, comunicabilidade expansiva e facilidade de interação social.',
    },
    {
      id: 'entusiasmo',
      name: 'Entusiasmo',
      score: norm(i * 0.9 + d * 0.2),
      description: 'Estilo animado e inspirador capaz de motivar e energizar pessoas ao redor.',
    },
    {
      id: 'sociabilidade',
      name: 'Sociabilidade',
      score: norm(i * 0.7 + s * 0.4),
      description: 'Facilidade para construir pontes de amizade e acolhimento interpessoal.',
    },
    {
      id: 'empatia',
      name: 'Empatia',
      score: norm(s * 0.7 + i * 0.4),
      description: 'Sensibilidade para compreender os sentimentos do próximo e se colocar no seu lugar.',
    },
    {
      id: 'paciencia',
      name: 'Paciência',
      score: norm(s * 1.0 + c * 0.2),
      description: 'Capacidade de manter a serenidade e a constância mesmo sob pressão e estresse.',
    },
    {
      id: 'persistencia',
      name: 'Persistência',
      score: norm(s * 0.8 + d * 0.3),
      description: 'Disciplina para seguir etapas e dar continuidade fiel às tarefas até o fim.',
    },
    {
      id: 'planejamento',
      name: 'Planejamento',
      score: norm(s * 0.5 + c * 0.6),
      description: 'Ponderação para projetar ações com antecedência e evitar correr riscos desnecessários.',
    },
    {
      id: 'organizacao',
      name: 'Organização',
      score: norm(c * 0.7 + s * 0.4),
      description: 'Atenção minuciosa à ordem, estrutura de processos e preservação de sistemas.',
    },
    {
      id: 'detalhismo',
      name: 'Detalhismo',
      score: norm(c * 1.0),
      description: 'Capacidade de notar nuances, pormenores e dados que outros deixam passar.',
    },
    {
      id: 'prudencia',
      name: 'Prudência',
      score: norm(c * 0.8 + s * 0.4),
      description: 'Cautela para evitar erros, resguardar a integridade da igreja e agir com método.',
    },
    {
      id: 'concentracao',
      name: 'Concentração',
      score: norm(c * 0.6 + s * 0.5),
      description: 'Capacidade de reter foco sustentado em atividades complexas sem se dispersar.',
    },
  ];

  return rawList.map((item) => ({
    ...item,
    level: getLevel(item.score),
  }));
}

// Guia de Comunicação Eficaz (Matriz Prática do CIS Assessment)
export function getCommunicationGuide(primary: DiscLetter, secondary: DiscLetter | null) {
  // Como os líderes e irmãos devem falar comigo
  const dosAndDonts: Record<DiscLetter, { do: string[]; dont: string[] }> = {
    D: {
      do: [
        'Vá direto ao ponto, seja breve, objetivo e específico.',
        'Concentre-se em metas, prazos e resultados mensuráveis.',
        'Ofereça opções e deixe-o participar da decisão final.',
        'Trate assuntos com profissionalismo e foco na solução.',
      ],
      dont: [
        'Não faça rodeios longos nem conte detalhes irrelevantes antes do objetivo.',
        'Não tente impor decisões autoritárias sem fundamentação prática.',
        'Não hesite ou demonstre insegurança excessiva ao cobrar entregas.',
        'Não o microgerencie nos mínimos passos da execução.',
      ],
    },
    I: {
      do: [
        'Seja caloroso, afetuoso e comece com um momento de comunhão e amizade.',
        'Elogie publicamente sua criatividade, boas ideias e iniciativa.',
        'Dê espaço para ele se expressar e compartilhar sua visão entusiasmada.',
        'Crie um ambiente dinâmico, leve, descontraído e participativo.',
      ],
      dont: [
        'Não seja frio, distante ou excessivamente burocrático no trato.',
        'Não o critique publicamente ou em frente à sua equipe.',
        'Não sobrecarregue com planilhas e relatórios maçantes sem checklist prévio.',
        'Não corte suas falas abruptamente sem validar seu sentimento.',
      ],
    },
    S: {
      do: [
        'Seja gentil, demonstre apreço pessoal sincero e converse com calma.',
        'Avise sobre mudanças de escala ou projetos com a devida antecedência.',
        'Explique o "como fazer" (passo a passo) em vez de apenas cobrar o resultado.',
        'Respeite o seu tempo para processar e responder a novos cenários.',
      ],
      dont: [
        'Não use tom de voz agressivo, incisivo ou gestos dominadores.',
        'Não force decisões imediatas no calor de um momento de tensão.',
        'Não promova mudanças drásticas sem explicar o porquê com carinho.',
        'Não descarte sua necessidade de estabilidade e segurança.',
      ],
    },
    C: {
      do: [
        'Prepare-se antes da conversa, trazendo dados, fatos e evidências sólidas.',
        'Seja lógico, sistemático e pontual na prestação de contas.',
        'Reconheça a qualidade do seu trabalho e a precisão dos seus detalhes.',
        'Dê garantias de segurança e tempo hábil para análise antes do prazo.',
      ],
      dont: [
        'Não fale de forma generalista com frases vagas ou sem embasamento.',
        'Não exija atalhos que comprometam as regras ou a qualidade técnica.',
        'Não desrespeite prazos de análise nem mude processos na base do improviso.',
        'Não leve críticas para o lado pessoal; foque nos fatos.',
      ],
    },
  };

  const targetLetters: DiscLetter[] = ['D', 'I', 'S', 'C'];
  const howITalkToOtherProfiles: CommunicationGuideline[] = targetLetters.map((l) => ({
    targetLetter: l,
    targetName: DISC_META[l].name,
    howToCommunicateDo: dosAndDonts[l].do,
    howToCommunicateDont: dosAndDonts[l].dont,
  }));

  const howOthersShouldTalkToMe = dosAndDonts[primary] || dosAndDonts.S;

  return {
    howOthersShouldTalkToMe,
    howITalkToOtherProfiles,
  };
}

// Perguntas de Aplicação Pessoal e Ministerial (Baseadas nas páginas 50-53 do PDF)
export const REFLECTION_QUESTIONS = [
  'Quais são os 3 comportamentos do meu perfil que mais geram frutos no meu ministério e na minha família?',
  'Quais atitudes reativas minhas sob estresse (ritmo, dureza, isolamento ou perfeccionismo) precisam ser pastoreadas pelo Espírito Santo?',
  'Em qual área da igreja meu estilo de liderança e temperamento bíblico têm o maior potencial de edificar a outros?',
  'Como posso me comunicar melhor com companheiros de equipe que possuem perfis totalmente opostos ao meu?',
];

/**
 * Função principal que sintetiza o Relatório Comportamental Completo estilo CIS Assessment
 */
export function generateFullDiscReport(
  scores: DiscScores,
  primary: DiscLetter,
  secondary: DiscLetter | null,
  lowest?: DiscLetter | null,
  personName: string = 'Servo de Deus'
): FullDiscReport {
  const code = secondary ? `${primary}${secondary}` : primary;
  const profileData =
    COMPOUND_PROFILES_CATALOG[code] ||
    COMPOUND_PROFILES_CATALOG[primary] ||
    COMPOUND_PROFILES_CATALOG.SD;

  const dimensions: DimensionAnalysis[] = [
    getDimensionAnalysis('D', scores.D || 0),
    getDimensionAnalysis('I', scores.I || 0),
    getDimensionAnalysis('S', scores.S || 0),
    getDimensionAnalysis('C', scores.C || 0),
  ];

  const leadership = calculateLeadershipStyles(scores);
  const communicationGuide = getCommunicationGuide(primary, secondary);
  const competencies = calculateCompetencies(scores);

  return {
    personName,
    primary,
    secondary,
    profileCode: code,
    profileData,
    dimensions,
    leadershipStyles: leadership.styles,
    predominantLeadership: leadership.predominant,
    communicationGuide,
    competencies,
    reflectionQuestions: REFLECTION_QUESTIONS,
  };
}
