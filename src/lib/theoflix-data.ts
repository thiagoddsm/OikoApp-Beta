export type Course = {
    id: string;
    level: number;
    title: string;
    type: string;
    image: string;
    desc: string;
    episodes: string[];
};

export const theoflixDB: Course[] = [
    // NIVEL 1: FUNDAMENTOS (Blue)
    {
        id: 'imersao',
        level: 1,
        title: "Imersão (Batismo)",
        type: "Obrigatório",
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d__nwiCWj79KpbxD5mJp7UhCLgqGfFDCLMrK4j8VDr_G7fKqZBpSv5q7JiweK0PAJDCAzDhc4LWsncvLrqx6lfUowTnDGeqYwPfn2omWO8eE5I9wwWqp8f1hFuUe3XF_bkqHklO0XqYOKcUM_GFup2YYoNHKMKUXLOknBeg7o93nJhO8dA",
        desc: "Fundamentação doutrinária para o início da caminhada pública com Cristo. Prepare-se para um mergulho profundo na fé.",
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
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d_-qefSPpUiQFhY6iaVb5Gc0mnj5h-8OslJahFT-aCoPdqAaioagTyUtMnDUpMd1rwMn0AE4Rg0Zr8nuZkNLPaoirlMuj0e4TCUqIZutrt_bRwk7pupZJOPN8Zsjjh6hmXshyFY85Q60I7-mPzc4iGiwmFKLE5Epcpuz38ZfECYj63j0Ng",
        desc: "Onboarding institucional. Alinhamento de visão, cultura e governo da nossa igreja local.",
        episodes: [
            "A História e o Futuro da IBM",
            "DNA Ministerial: Visão de Células e Discipulado",
            "Mordomia Cristã: Dízimos, Ofertas e Talentos",
            "Direitos, Deveres e o Estatuto da Igreja"
        ]
    },
    // NIVEL 2: MATURIDADE (Rose)
    {
        id: 'cresca',
        level: 2,
        title: "Cresça",
        type: "Obrigatório",
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d_8iI9N5O_IVkLcTQCMUA3v57eo1Itq1rD_m_pUYUnHN619Ypq7aQEXwarnAA6FuMVYTYbgNAWVFKw1i6WQYpytE_UdJp3glPuwhV6CkZXxReRzhCKWiDe0ckm6spQMsCEM63irV0hCnYcRzQC4b_X6XS8uZjcJUcHErWDut5JmU9tEzGA",
        desc: "Tratamento de emoções e fundamentação da identidade filial. Uma jornada de cura interior.",
        episodes: [
            "Identidade: Quem sou eu em Cristo?",
            "Paternidade: Curando a imagem do Pai",
            "Perdão: A chave para a liberdade emocional",
            "Quebra de ciclos geracionais e maldições",
            "Enchimento do Espírito e Vida Vitoriosa"
        ]
    },
    // NIVEL 3: LIDERANÇA (Amber)
    {
        id: 'lidere1',
        level: 3,
        title: "Lidere 1",
        type: "Formação",
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d_9_Ky5Xl4sKtmiJspRPDTHqRBCtST3_jSIToRbwwN1lqpYky4b3EebuZcFgMoACsq_SKZJl2AMkkrXQw6gp8WjKxN_beaOjnfisZIZh65kgsXVtNC7CtzvJGN6iQqJr8ZoliDLQ0PuX5Qh92IXK74Q0xiq2MeaZNYpSLGGwUUu4IYXFVQ",
        desc: "Princípios fundamentais do caráter e influência do líder cristão.",
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
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d_9b5huFDPMhmWRUliM29ymqkEeh5ID6nbeddknTRTvAd9vYEAo1iWqkrp2FEUdPZObJBiHCeFxz6uyi3tGCo76WR2fXrKDzI9GGYsYp3CZ3ZuOGD1zaCeLaC6TSKYIKg5Ldvtj6tZlj0S4I8PRMJDCv7ohcXwUizywJ_-O7tSVI8Hya",
        desc: "Autoconhecimento e descoberta de vocação para o serviço prático.",
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
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d__baxiPBm3ea4eF1y8k1tT5gpdOEcMux8VLBS-j9ZHLj6ySdk0WlQRH0xSnexrN3WmHZ6-oB84LyVVPxXPAx5TE4pYfEsQxHEK5g5K5Y9Q2EQazrvB03w5R9q95_xRGvGKen7VQ2dJRN_FmyA60DUkWE5WsCDgqDruvC1SigrBb5oTj8Q",
        desc: "Capacitação técnica para assumir a direção de uma célula.",
        episodes: [
            "Estrutura de uma Reunião de GC Eficaz",
            "Dinâmicas de Grupo e Quebra-gelos Estratégicos",
            "Pastoreio 1-a-1: Como cuidar das ovelhas",
            "Estratégias de Multiplicação e Formação de Co-líderes"
        ]
    },
    // NIVEL 4: GESTÃO (Purple)
    {
        id: 'supervisione1',
        level: 4,
        title: "Supervisione 1",
        type: "Líder de Área",
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d__jED8KhtEsVxgkE9YuEpx9Ms4mUQYO0pEAReBGOJ30lLbaS3e2kCU_iW2YSg88PmfBb8MOXPgIeJ07BApomIrfu9fmCeqjyjCakQt2MBcka4YzS3wZA0bMiqFEU9Pm5i4ulqAdLwbM8zD6E1npl5G8QoVVC3wXrVYLjMsumB4jOrWjQw",
        desc: "A arte de liderar líderes e gerir processos coletivos.",
        episodes: [
            "Como Mentorear Líderes de GC",
            "Gestão de Conflitos em níveis intermediários",
            "Análise de Indicadores (KPIs) de Crescimento",
            "Condução de Reuniões de Liderança de Área"
        ]
    },
    {
        id: 'supervisione2',
        level: 4,
        title: "Supervisione 2",
        type: "Líder de Rede",
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d_8UmBJIXRbcy1JuzClviRNODDZ4AxYbDuZa1nhnBc-rI_6TCPCN17o6BaNTLZ-1t0cWQWlkWM0ETwKbxbCCee38brT2C1Lypj6GW1bBcN1glLCF6Ihg7yS9KQFgGLcVuA2ymRxrsXFonLPFZ9dCpx2bTxOOw_bimowNsd-_HCxW6VsC2g",
        desc: "Visão macro-estratégica e expansão de território ministerial.",
        episodes: [
            "Desenvolvimento de Visão de Longo Prazo",
            "Formação e Treinamento de Novos Supervisores",
            "Planejamento Estratégico de Rede e Eventos Macro",
            "Alinhamento Financeiro e Administrativo de Redes"
        ]
    },
    {
        id: 'avance',
        level: 4,
        title: "Avance",
        type: "Nível Pastoral",
        image: "https://lh3.googleusercontent.com/gg-dl/AOI_d__f6UEEGhSw45EsKsaHtmjO5OgAxoy774TfRA6L1nCR-UFcj9S2PbNmoH7DdSu28CnDVfKQocVq9C489l9eH_B3pRGm4SKaJK67Zwn6CHnjrof7P2gZwgocT7ZW_vDCpb3N9yO4CnvHNR0QWidgV4BO09FatBi3kdAddDRu-hfAh9zIHA",
        desc: "Teologia aprofundada e mentoria contínua para o corpo ministerial.",
        episodes: [
            "Panorama Teológico e Doutrina de Fé",
            "Aconselhamento e Mentoria de Casais/Famílias",
            "Apologética: Defesa da Fé no mundo contemporâneo",
            "Gestão de Crises e Ética Eclesiástica Superior"
        ]
    }
];
