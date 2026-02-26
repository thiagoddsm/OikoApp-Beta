
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
            { title: "Salvação, Arrependimento e Fé Proporcional", youtubeId: "dQw4w9WgXcQ", duration: "45min" },
            { title: "O simbolismo bíblico do Batismo nas Águas", youtubeId: "dQw4w9WgXcQ", duration: "50min" },
            { title: "A Ceia do Senhor: Memória e Esperança", youtubeId: "dQw4w9WgXcQ", duration: "40min" },
            { title: "Introdução às Disciplinas Espirituais", youtubeId: "dQw4w9WgXcQ", duration: "55min" }
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
            { title: "Aula 1: Introdução & História da IBM", youtubeId: "dQw4w9WgXcQ", duration: "60min" },
            { title: "Aula 2: DNA Ministerial & Visão de Células", youtubeId: "dQw4w9WgXcQ", duration: "75min" },
            { title: "Aula 3: Mordomia Cristã & Finanças do Reino", youtubeId: "dQw4w9WgXcQ", duration: "65min" },
            { title: "Aula 4: Governança, Estatuto & Ética", youtubeId: "dQw4w9WgXcQ", duration: "70min" },
            { title: "Aula 5: Comissionamento & Compromisso", youtubeId: "dQw4w9WgXcQ", duration: "90min" }
        ]
    },
    // NIVEL 2: MATURIDADE (Rose)
    {
        id: 'crescer',
        level: 2,
        title: "Curso Crescer",
        type: "Obrigatório",
        tags: ["Maturidade", "Doutrina"],
        duration: "6h 20min",
        image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxwbGFudCUyMGdyb3d0aHxlbnwwfHx8fDE3NjMyNTM0NjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        desc: "Desenvolva sua maturidade cristã e entenda os princípios de uma vida frutífera no Reino. Este curso é o segundo passo fundamental na nossa trilha de crescimento espiritual.",
        episodes: [
            { title: "Aula 1: A Base da Maturidade Cristã", youtubeId: "dQw4w9WgXcQ", duration: "55min" },
            { title: "Aula 2: Vida no Espírito e Santificação", youtubeId: "dQw4w9WgXcQ", duration: "60min" },
            { title: "Aula 3: Caráter Cristão e o Fruto do Espírito", youtubeId: "dQw4w9WgXcQ", duration: "50min" },
            { title: "Aula 4: Mordomia dos Dons e Vocação", youtubeId: "dQw4w9WgXcQ", duration: "65min" },
            { title: "Aula 5: Vida de Oração e Intimidade", youtubeId: "dQw4w9WgXcQ", duration: "45min" },
            { title: "Aula 6: Autoridade Espiritual e Submissão", youtubeId: "dQw4w9WgXcQ", duration: "50min" }
        ]
    }
];
