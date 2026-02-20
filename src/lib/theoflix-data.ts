
export type Episode = {
    title: string;
    vimeoId?: string;
    duration?: string;
    desc?: string;
};

export type Course = {
    id: string;
    level: number;
    title: string;
    type: string;
    image: string;
    desc: string;
    episodes: Episode[];
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
            { title: "Salvação, Arrependimento e Fé Proporcional", vimeoId: "76979871" },
            { title: "O simbolismo bíblico do Batismo nas Águas", vimeoId: "76979871" },
            { title: "A Ceia do Senhor: Memória e Esperança", vimeoId: "76979871" },
            { title: "Introdução às Disciplinas Espirituais", vimeoId: "76979871" }
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
        desc: "Jornada de integração em 5 etapas fundamentais para quem deseja se tornar parte do organismo da Igreja Batista da Manhã. Entenda nossa histótia, visão e como você se encaixa.",
        episodes: [
            { title: "Aula 1: Introdução & História da IBM", vimeoId: "76979871" },
            { title: "Aula 2: DNA Ministerial & Visão de Células", vimeoId: "76979871" },
            { title: "Aula 3: Mordomia Cristã & Finanças do Reino", vimeoId: "76979871" },
            { title: "Aula 4: Governança, Estatuto & Ética", vimeoId: "76979871" },
            { title: "Aula 5: Comissionamento & Compromisso", vimeoId: "76979871" }
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
            { title: "A Origem da Bíblia: Cânon e Inspiração", vimeoId: "76979871" },
            { title: "Antigo Testamento: A Promessa", vimeoId: "76979871" },
            { title: "Novo Testamento: O Cumprimento", vimeoId: "76979871" },
            { title: "Ferramentas de Estudo e Hermenêutica Básica", vimeoId: "76979871" }
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
            { title: "Identidade: Quem sou eu em Cristo?", vimeoId: "76979871" },
            { title: "Paternidade: Curando a imagem do Pai", vimeoId: "76979871" },
            { title: "Perdão: A chave para a liberdade emocional", vimeoId: "76979871" },
            { title: "Quebra de ciclos geracionais", vimeoId: "76979871" },
            { title: "Enchimento do Espírito", vimeoId: "76979871" }
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
            { title: "O Papel do Homem e da Mulher no Lar", vimeoId: "76979871" },
            { title: "Comunicação e Intimidade no Casamento", vimeoId: "76979871" },
            { title: "Educação de Filhos: Herança do Senhor", vimeoId: "76979871" },
            { title: "Finanças em Família e Legado", vimeoId: "76979871" }
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
            { title: "Liderança segundo o modelo de Jesus", vimeoId: "76979871" },
            { title: "O caráter do líder: Integridade", vimeoId: "76979871" },
            { title: "Gestão de Tempo e Prioridades", vimeoId: "76979871" },
            { title: "Resolução de Conflitos", vimeoId: "76979871" }
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
            { title: "Estrutura de uma Reunião de GC Eficaz", vimeoId: "76979871" },
            { title: "Dinâmicas de Grupo Estratégicas", vimeoId: "76979871" },
            { title: "Pastoreio 1-a-1: Como cuidar", vimeoId: "76979871" },
            { title: "Estratégias de Multiplicação", vimeoId: "76979871" }
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
            { title: "Como Mentorear Líderes de GC", vimeoId: "76979871" },
            { title: "Gestão de Conflitos Intermediários", vimeoId: "76979871" },
            { title: "Análise de Indicadores (KPIs)", vimeoId: "76979871" },
            { title: "Condução de Reuniões de Área", vimeoId: "76979871" }
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
            { title: "Panorama Teológico Superior", vimeoId: "76979871" },
            { title: "Aconselhamento e Mentoria Pastoral", vimeoId: "76979871" },
            { title: "Apologética Contemporânea", vimeoId: "76979871" },
            { title: "Gestão de Crises e Ética", vimeoId: "76979871" }
        ]
    }
];
