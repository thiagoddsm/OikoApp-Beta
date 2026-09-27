import { getAdminDb } from './src/lib/firebase-admin';

async function seed() {
  const db = getAdminDb();
  
  const mockData = {
    userId: null,
    nome: "João Silva (Simulação IA)",
    email: "joao.simulacao@teste.com",
    telefone: "21988887777",
    dataNascimento: "1990-05-20",
    estadoCivil: "Casado(a)",
    gcInfo: "GC Centro",
    formacao: "Administração de Empresas",
    profissao: "Gerente Operacional",
    habilidades: ["s2", "s8", "s12"],
    coracao: {
      h1: "Ajudar as pessoas a descobrirem seu potencial e organizar processos para que a igreja cresça de forma saudável.",
      h2: "Jovens adultos e líderes de pequenos grupos.",
      h3: "Mentoria de vida e carreira. Gosto de ajudar porque já fui muito ajudado nessa área.",
      h4: "Educação cristã e estruturação de novos ministérios focados em desenvolvimento humano.",
      h5: "Ver a igreja local funcionando com excelência, onde cada voluntário serve exatamente na sua vocação natural."
    },
    perso: { p1: 4, p2: 5, p3: 4, p4: 2, p5: 1, p6: 2, p7: 4, p8: 4, p9: 5, p10: 4, p11: 2, p12: 5, p13: 2, p14: 5 },
    dom: {}, // Não precisa preencher todas as 133 pro backend
    quadrante: "Pessoas / Formal",
    orgScore: 4.2,
    motScore: 4.0,
    domScores: { "A": 12, "S": 10, "F": 9 },
    top3: [
      { id: "A", nome: "Administração", score: 12, desc: "Capacidade de entender objetivos e organizar recursos." },
      { id: "S", nome: "Ensino", score: 10, desc: "Capacidade de transmitir verdades bíblicas de forma prática." },
      { id: "F", nome: "Encorajamento", score: 9, desc: "Capacidade de consolar e motivar pessoas." }
    ],
    createdAt: new Date(),
    aiAnalysis: null
  };

  try {
    const res = await db.collection('shape_results').add(mockData);
    console.log('✅ Simulação inserida com sucesso! ID:', res.id);
  } catch (err) {
    console.error('Erro:', err);
  }
}

seed().then(() => process.exit(0));
