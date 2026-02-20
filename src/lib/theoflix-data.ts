
export type Course = {
    id: string;
    level: number;
    title: string;
    type: string;
    image: string;
    desc: string;
    episodes: string[];
    duration?: string;
    tags?: string[];
};

export const theoflixDB: Course[] = [
    // NIVEL 1: FUNDAMENTOS (Blue)
    {
        id: 'imersao',
        level: 1,
        title: "Imersão (Batismo)",
        type: "Obrigatório",
        tags: ["Doutrina", "Início"],
        duration: "4h 30min",
        image: "https://images.unsplash.com/photo-1510154221590-ff63e90a136f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHx3YXRlciUyMGJhcHRpc218ZW58MHx8fHwxNzYzMjUzNDYwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Fundamentação doutrinária para o início da caminhada pública com Cristo. Prepare-se para um mergulho profundo na fé e no compromisso com o Reino.",
        episodes: [
            "Salvação, Arrependimento e Fé Proporcional",
            "O simbolismo bíblico do Batismo nas Águas",
            "A Ceia do Senhor: Memória e Esperança",
            "Introdução às Disciplinas Espirituais (Oração e Bíblia)"
        ]
    },
    {
        id: 'membros',
        level: 1,
        title: "Curso de Membros",
        type: "Obrigatório",
        tags: ["Integração", "DNA"],
        duration: "7h 15min",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxtdXNpYyUyMGNodXJjaHxlbnwwfHx8fDE3NjMyNTMyNDZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Jornada de integração em 5 etapas fundamentais para quem deseja se tornar parte do organismo da Igreja Batista da Manhã. Entenda nossa história, visão e como você se encaixa.",
        episodes: [
            "Aula 1: Introdução & História da IBM",
            "Aula 2: DNA Ministerial & Visão de Células",
            "Aula 3: Mordomia Cristã & Finanças do Reino",
            "Aula 4: Governança, Estatuto & Ética",
            "Aula 5: Comissionamento & Compromisso"
        ]
    },
    {
        id: 'fundamentos-biblicos',
        level: 1,
        title: "Fundamentos Bíblicos",
        type: "Eletivo",
        tags: ["Bíblia", "Ensino"],
        duration: "5h 45min",
        image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxiaWJsZXxlbnwwfHx8fDE3NjMyNTM0NjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Uma visão panorâmica sobre a estrutura da Bíblia, autoria e como estudar as escrituras de forma eficaz.",
        episodes: [
            "A Origem da Bíblia: Cânon e Inspiração",
            "Antigo Testamento: A Promessa",
            "Novo Testamento: O Cumprimento",
            "Ferramentas de Estudo e Hermenêutica Básica"
        ]
    },
    // NIVEL 2: MATURIDADE (Rose)
    {
        id: 'cresca',
        level: 2,
        title: "Cresça",
        type: "Obrigatório",
        tags: ["Cura Interior", "Identidade"],
        duration: "6h 00min",
        image: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxzcmn0dWFsfGVufDB8fHx8MTc2MzI1MzUxMXww&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Tratamento de emoções e fundamentação da identidade filial. Uma jornada de cura interior para que você possa crescer de forma saudável no espírito.",
        episodes: [
            "Identidade: Quem sou eu em Cristo?",
            "Paternidade: Curando a imagem do Pai",
            "Perdão: A chave para a liberdade emocional",
            "Quebra de ciclos geracionais e maldições",
            "Enchimento do Espírito e Vida Vitoriosa"
        ]
    },
    {
        id: 'familia',
        level: 2,
        title: "Aliança (Família)",
        type: "Eletivo",
        tags: ["Casais", "Família"],
        duration: "5h 20min",
        image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxmYW1pbHl8ZW58MHx8fHwxNzYzMjUzNTQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Princípios bíblicos para o fortalecimento do casamento e da criação de filhos na luz da palavra.",
        episodes: [
            "O Papel do Homem e da Mulher no Lar",
            "Comunicação e Intimidade no Casamento",
            "Educação de Filhos: Herança do Senhor",
            "Finanças em Família e Legado"
        ]
    },
    {
        id: 'financas-reino',
        level: 2,
        title: "Finanças do Reino",
        type: "Masterclass",
        tags: ["Finanças", "Mordomia"],
        duration: "3h 15min",
        image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxtb25leSUyMGJpYmxlfGVufDB8fHx8MTc2MzI1MzU0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Como gerir seus recursos de acordo com a sabedoria bíblica. Do endividamento à generosidade extravagante.",
        episodes: [
            "Princípios de Prosperidade e Mordomia",
            "Vencendo a Mentalidade de Escassez",
            "Planejamento e Orçamento Cristão",
            "Investindo no Reino e nas Pessoas"
        ]
    },
    // NIVEL 3: LIDERANÇA (Amber)
    {
        id: 'lidere1',
        level: 3,
        title: "Lidere 1",
        type: "Formação",
        tags: ["Caráter", "Serviço"],
        duration: "4h 00min",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHx0ZWFtd29ya3xlbnwwfHx8fDE3NjMyNTM1NzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Princípios fundamentais do caráter e influência do líder cristão. Lidere a si mesmo antes de liderar outros.",
        episodes: [
            "Liderança segundo o modelo de Jesus (Servo)",
            "O caráter do líder: Integridade e Vida Privada",
            "Gestão de Tempo e Prioridades do Reino",
            "Comunicação Assertiva e Resolução de Conflitos"
        ]
    },
    {
        id: 'molde',
        level: 3,
        title: "Molde de Servo",
        type: "Workshop",
        tags: ["Dons", "Vocação"],
        duration: "3h 30min",
        image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHx3b3Jrc2hvcHxlbnwwfHx8fDE3NjMyNTM2MDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Autoconhecimento e descoberta de vocação para o serviço prático dentro do organismo da igreja local.",
        episodes: [
            "Inventário de Dons Espirituais",
            "Perfil Comportamental (DISC) aplicado ao ministério",
            "Descobrindo sua Paixão e Estilo Pessoal",
            "Mapa de Ministérios da IBM: Onde eu me encaixo?"
        ]
    },
    {
        id: 'lidere2',
        level: 3,
        title: "Lidere 2 (Gestão de GC)",
        type: "Nível Técnico",
        tags: ["Células", "Gestão"],
        duration: "5h 45min",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHhmcmllbmRzfGVufDB8fHx8MTc2MzI1MzYzN3ww&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Capacitação técnica para assumir a direção de uma célula. Aprenda a arte de pastorear pequenos grupos.",
        episodes: [
            "Estrutura de uma Reunião de GC Eficaz",
            "Dinâmicas de Grupo e Quebra-gelos Estratégicos",
            "Pastoreio 1-a-1: Como cuidar das ovelhas",
            "Estratégias de Multiplicação e Formação de Co-líderes"
        ]
    },
    {
        id: 'lideranca-criativa',
        level: 3,
        title: "Liderança Criativa",
        type: "Laboratório",
        tags: ["Criatividade", "Visão"],
        duration: "2h 45min",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxjb2xvcnxlbnwwfHx8fDE3NjMyNTM2Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Como inovar no ministério sem perder a essência do evangelho. Desbloqueando o potencial criativo da sua equipe.",
        episodes: [
            "O Criador e a Criatividade Humana",
            "Design Thinking para Ministérios",
            "Cultura de Inovação na Igreja",
            "Executando Ideias com Excelência"
        ]
    },
    // NIVEL 4: GESTÃO (Purple)
    {
        id: 'supervisione1',
        level: 4,
        title: "Supervisione 1",
        type: "Líder de Área",
        tags: ["Estratégia", "Mentoria"],
        duration: "4h 15min",
        image: "https://images.unsplash.com/photo-1454165833767-027ffea9e778?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxNXx8YnVzaW5lc3N8ZW58MHx8fHwxNzYzMjUzNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "A arte de liderar líderes e gerir processos coletivos em nível de área. Foco em mentoria e resultados ministeriais.",
        episodes: [
            "Como Mentorear Líderes de GC",
            "Gestão de Conflitos em níveis intermediários",
            "Análise de Indicadores (KPIs) de Crescimento",
            "Condução de Reuniões de Liderança de Área"
        ]
    },
    {
        id: 'avance',
        level: 4,
        title: "Avance",
        type: "Nível Pastoral",
        tags: ["Teologia", "Pastoreio"],
        duration: "12h 00min",
        image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMnx8Ym9va3xlbnwwfHx8fDE3NjMyNTM3MzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Teologia aprofundada e mentoria contínua para o corpo ministerial e aspirantes ao pastorado.",
        episodes: [
            "Panorama Teológico e Doutrina de Fé",
            "Aconselhamento e Mentoria de Casais/Famílias",
            "Apologética: Defesa da Fé no mundo contemporâneo",
            "Gestão de Crises e Ética Eclesiástica Superior"
        ]
    },
    {
        id: 'apocalipse-revelado',
        level: 4,
        title: "Apocalipse Revelado",
        type: "Teologia",
        tags: ["Escatologia", "Profecia"],
        duration: "8h 30min",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxtb3VudGFpbnxlbnwwfHx8fDE3NjMyNTM3MzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Uma análise exegética e histórica do livro de Apocalipse. Entenda os símbolos e a mensagem de esperança para a igreja.",
        episodes: [
            "Introdução e Contexto das 7 Igrejas",
            "Os Selos, Trombetas e Taças",
            "A Mulher, o Dragão e as Bestas",
            "O Novo Céu e a Nova Terra"
        ]
    }
];
