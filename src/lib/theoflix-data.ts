export type Question = {
    question: string;
    type?: 'multiple' | 'essay';
    options?: string[];
    correctIndex?: number;
    aiActive?: boolean;
    essayGabarito?: string;
};

export type Episode = {
    title: string;
    youtubeId?: string;
    duration?: string;
    desc?: string;
    quiz?: {
        enabled: boolean;
        questions: Question[];
    };
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
    requireEnrollment?: boolean;
};

export const theoflixDB: Course[] = [
    // NIVEL 1: FUNDAMENTOS (Blue)
    {
        id: 'batismo',
        level: 1,
        title: "Batismo",
        type: "Obrigatório",
        tags: ["Doutrina", "Início"],
        duration: "3h 10min",
        image: "https://images.unsplash.com/photo-1510154221590-ff63e90a136f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        desc: "Fundamentação doutrinária para o início da caminhada pública com Cristo. Prepare-se para um mergulho profundo na fé e no compromisso com o Reino.",
        requireEnrollment: true,
        episodes: [
            { title: "Salvação, Arrependimento e Fé Proporcional", youtubeId: "7wfYIMvS_9g", duration: "45min" },
            { title: "O simbolismo bíblico do Batismo nas Águas", youtubeId: "7wfYIMvS_9g", duration: "50min" },
            { title: "A Ceia do Senhor: Memória e Esperança", youtubeId: "7wfYIMvS_9g", duration: "40min" },
            { title: "Introdução às Disciplinas Espirituais", youtubeId: "7wfYIMvS_9g", duration: "55min" }
        ]
    },
    {
        id: 'pertencer',
        level: 1,
        title: "Pertencer",
        type: "Obrigatório",
        tags: ["Integração", "DNA"],
        duration: "1h 36min",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        desc: "Jornada de integração em 5 etapas fundamentais para quem deseja se tornar parte do organismo da Igreja Batista da Manhã. Entenda nossa história, visão e como você se encaixa.",
        episodes: [
            { title: "Aula 1: Introdução & História da IBM", youtubeId: "7wfYIMvS_9g", duration: "20min" },
            { title: "Aula 2: DNA Ministerial & Visão de Células", youtubeId: "7wfYIMvS_9g", duration: "25min" },
            { title: "Aula 3: Mordomia Cristã & Finanças do Reino", youtubeId: "7wfYIMvS_9g", duration: "18min" },
            { title: "Aula 4: Governança, Estatuto & Ética", youtubeId: "7wfYIMvS_9g", duration: "20min" },
            { title: "Aula 5: Comissionamento & Compromisso", youtubeId: "7wfYIMvS_9g", duration: "23min" }
        ]
    },
    // NIVEL 2: CONSOLIDAÇÃO (Rose)
    {
        id: 'crescer',
        level: 2,
        title: "Crescer",
        type: "Maturidade",
        tags: ["Maturidade", "Doutrina"],
        duration: "6h 20min",
        image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        desc: "Desenvolva sua maturidade cristã e entenda os princípios de uma vida frutífera no Reino. Este curso é o segundo passo fundamental na nossa trilha de crescimento espiritual.",
        episodes: [
            { title: "Aula 1: A Base da Maturidade Cristã", youtubeId: "7wfYIMvS_9g", duration: "55min" },
            { title: "Aula 2: Vida no Espírito e Santificação", youtubeId: "7wfYIMvS_9g", duration: "60min" },
            { title: "Aula 3: Caráter Cristão e o Fruto do Espírito", youtubeId: "7wfYIMvS_9g", duration: "50min" },
            { title: "Aula 4: Mordomia dos Dons e Vocação", youtubeId: "7wfYIMvS_9g", duration: "65min" },
            { title: "Aula 5: Vida de Oração e Intimidade", youtubeId: "7wfYIMvS_9g", duration: "45min" },
            { title: "Aula 6: Autoridade Espiritual e Submissão", youtubeId: "7wfYIMvS_9g", duration: "50min" }
        ]
    },
    {
        id: 'cuidar',
        level: 2,
        title: "Cuidar",
        type: "Pastoreio",
        tags: ["Cuidado", "Célula"],
        duration: "4h 40min",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        desc: "Capacitação para o cuidado relacional, discipulado de novos convertidos e pastoreio mútuo nas células da comunidade.",
        episodes: [
            { title: "Aula 1: O Coração do Cuidador", youtubeId: "7wfYIMvS_9g", duration: "45min" },
            { title: "Aula 2: Escuta Empática e Aconselhamento Bíblico", youtubeId: "7wfYIMvS_9g", duration: "50min" },
            { title: "Aula 3: Acompanhamento de Novos Decididos", youtubeId: "7wfYIMvS_9g", duration: "45min" },
            { title: "Aula 4: Intercessão e Batalha Espiritual", youtubeId: "7wfYIMvS_9g", duration: "50min" }
        ]
    },
    // NIVEL 3: LIDERANÇA & MULTIPLICAÇÃO (Amber)
    {
        id: 'discipular',
        level: 3,
        title: "Discipular",
        type: "Liderança",
        tags: ["Liderança", "Multiplicação"],
        duration: "5h 15min",
        image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        desc: "Escola de líderes e discipuladores para formação ministerial, pastoreio de líderes e multiplicação celular.",
        episodes: [
            { title: "Aula 1: O Modelo de Jesus para o Discipulado", youtubeId: "7wfYIMvS_9g", duration: "50min" },
            { title: "Aula 2: Formando Discípulos Multiplicadores", youtubeId: "7wfYIMvS_9g", duration: "55min" },
            { title: "Aula 3: Gestão e Dinâmica do Grupo de Crescimento", youtubeId: "7wfYIMvS_9g", duration: "50min" },
            { title: "Aula 4: Enviando e Comissionando Novos Líderes", youtubeId: "7wfYIMvS_9g", duration: "60min" }
        ]
    },
    // NIVEL 4: ALTA GESTÃO & SUPERVISÃO (Purple)
    {
        id: 'papo_da_manha',
        level: 4,
        title: "Papo da manhã",
        type: "Alta Gestão",
        tags: ["Mentoria", "Supervisão"],
        duration: "3h 45min",
        image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        desc: "Encontros de alinhamento, supervisão estratégica e mentoria ministerial com a alta liderança da igreja.",
        episodes: [
            { title: "Episódio 1: Visão Estratégica e Alinhamento Ministerial", youtubeId: "7wfYIMvS_9g", duration: "45min" },
            { title: "Episódio 2: Cultura de Honra e Excelência", youtubeId: "7wfYIMvS_9g", duration: "40min" },
            { title: "Episódio 3: Mentoria Pastoral e Pastoreio de Pastores", youtubeId: "7wfYIMvS_9g", duration: "50min" },
            { title: "Episódio 4: Liderança Sob Pressão e Resiliência", youtubeId: "7wfYIMvS_9g", duration: "45min" }
        ]
    }
];
