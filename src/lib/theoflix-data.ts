
export type Episode = {
    title: string;
    youtubeId?: string;
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
            { title: "Salvação, Arrependimento e Fé Proporcional", youtubeId: "dQw4w9WgXcQ" },
            { title: "O simbolismo bíblico do Batismo nas Águas", youtubeId: "dQw4w9WgXcQ" },
            { title: "A Ceia do Senhor: Memória e Esperança", youtubeId: "dQw4w9WgXcQ" },
            { title: "Introdução às Disciplinas Espirituais", youtubeId: "dQw4w9WgXcQ" }
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
            { title: "Aula 1: Introdução & História da IBM", youtubeId: "dQw4w9WgXcQ" },
            { title: "Aula 2: DNA Ministerial & Visão de Células", youtubeId: "dQw4w9WgXcQ" },
            { title: "Aula 3: Mordomia Cristã & Finanças do Reino", youtubeId: "dQw4w9WgXcQ" },
            { title: "Aula 4: Governança, Estatuto & Ética", youtubeId: "dQw4w9WgXcQ" },
            { title: "Aula 5: Comissionamento & Compromisso", youtubeId: "dQw4w9WgXcQ" }
        ]
    }
];
