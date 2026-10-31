import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { calculateMinistryFit } from '@/lib/ministry-benchmarks';
import { DISC_BLINDSPOT_META } from '@/lib/disc-meta';
import type { DiscLetter } from '@/lib/disc-questions';

const ai = genkit({ plugins: [googleAI()] });

export async function POST(req: NextRequest) {
  try {
    const { resultId, shapeData } = await req.json();
    if (!shapeData) return NextResponse.json({ error: 'Dados obrigatórios' }, { status: 400 });

    // 1. Identifica Ponto Cego
    let blindspotInfo = '';
    const lowestLetter = (shapeData.discLowest as DiscLetter) || null;
    if (lowestLetter && DISC_BLINDSPOT_META[lowestLetter]) {
      const b = DISC_BLINDSPOT_META[lowestLetter];
      blindspotInfo = `\n- Ponto Cego / Fator com menor pontuação (${lowestLetter}): ${b.title} (${b.summary}).\n  Alerta pastoral: ${b.avoidDelegating}`;
    }

    // 2. Calcula Match Scores por Lógica Fuzzy
    let fuzzyMatchesText = '';
    if (shapeData.discScores) {
      const fits = calculateMinistryFit(shapeData.discScores, shapeData.top3 || []);
      const top3Fits = fits.slice(0, 3);
      fuzzyMatchesText = `\n- Top 3 Áreas Calculadas pelo Algoritmo de Aderência Vocacional (Fuzzy Match):\n` +
        top3Fits.map((f, i) => `  ${i + 1}. ${f.benchmark.name}: ${f.fitPercentage}% de aderência (${f.reasons.join('; ')})`).join('\n');
    }

    const prompt = `Você é um pastor e orientador ministerial sênior da Oiko Comunidade, em São Gonçalo/RJ.
Analise o perfil S.H.A.P.E. completo abaixo (com metodologia comportamental DISC, dons espirituais, ponto cego e cálculo de aderência vocacional) e gere uma recomendação personalizada, empática e estratégica para a liderança pastoral guiar e acolher esta pessoa.

IMPORTANTE: Não se limite a áreas que existam formalmente. Baseie-se nos dons, habilidades, perfil comportamental DISC e sonhos da pessoa para sugerir áreas novas ou combinações criativas.

Perfil do Voluntário:
- Nome: ${shapeData.nome}
- Perfil Integrado de Atuação (Merge: Ambiente + Instinto de Ação):
  * Preferência de Ambiente de Trabalho (Quadrante Clássico): ${shapeData.quadrante || 'Não informado'} ${shapeData.orgScore ? `(Organização: ${shapeData.orgScore}/5.0 | Motivação: ${shapeData.motScore}/5.0)` : ''}
  * Instinto Comportamental Natural (DISC):
    - Perfil Primário: ${shapeData.discPrimary || 'Não avaliado via DISC'}
    - Perfil Secundário: ${shapeData.discSecondary || 'Não avaliado'}
    - Distribuição (D, I, S, C): ${shapeData.discScores ? JSON.stringify(shapeData.discScores) : 'Sem pontuação'}${blindspotInfo}
- Top 3 Dons Espirituais: ${shapeData.top3?.map((d: any) => (d.nome || d.name) + ' (' + d.score + 'pts)').join(', ') || 'Não avaliados'}
- Área onde sente chamado para servir: ${shapeData.ministryTarget || 'Não especificada'}${fuzzyMatchesText}
- Profissão/Formação: ${shapeData.profissao || shapeData.formacao || 'Não informado'}
- Habilidades Profissionais: ${(shapeData.habilidades || []).join(', ') || 'Não informadas'}
- Sonhos e Coração:
${Object.entries(shapeData.coracao || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  Não preenchido'}
- Experiências e Disponibilidade:
${Object.entries(shapeData.experiencias || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  Não preenchido'}

DIRETRIZ ESPECIAL - ANÁLISE COMBINADA (AMBIENTE + INSTINTO):
O voluntário possui preferência de ambiente de trabalho focada no Quadrante [${shapeData.quadrante || 'Geral'}] e seu comportamento natural DISC é [${shapeData.discPrimary || 'N/A'}${shapeData.discSecondary ? ' + ' + shapeData.discSecondary : ''}].
No campo 'resumoServidor', faça uma análise combinada explicando como essa preferência de ambiente de trabalho (formalidade vs flexibilidade, foco em pessoas vs tarefas) interage com seu instinto comportamental de ação e decisão (DISC). Mostre como esse equilíbrio gera o estilo único de servir desta pessoa.

Responda OBRIGATORIAMENTE em JSON válido com esta estrutura exata:
{
  "resumoServidor": "2-3 parágrafos sobre o perfil único desta pessoa, combinando seus dons, perfil comportamental DISC e motivações",
  "areasRecomendadas": ["área recomendada 1", "área recomendada 2", "área recomendada 3"],
  "comoComunicar": [
    "Dica prática 1 de como a liderança deve falar e alinhar expectativas com esse perfil",
    "Dica prática 2"
  ],
  "comoGerenciar": [
    "Prática recomendada de liderança e acompanhamento ministerial para potencializar esse voluntário",
    "Prática recomendada 2"
  ],
  "evitar": [
    "O que os líderes e coordenadores NUNCA devem fazer ou evitar para não desmotivar esse perfil",
    "Ponto de atenção ou atrito comum 2"
  ],
  "perguntasEntrevista": [
    {
      "topico": "Alinhamento de Dons & Chamado",
      "pergunta": "Pergunta aberta contextualizada cruzando o nome da pessoa, dom e sonho para o pastor usar no bate-papo",
      "objetivoPastoral": "O que o líder deve observar ou ouvir na resposta"
    },
    {
      "topico": "Estilo de Serviço & DISC",
      "pergunta": "Pergunta aberta sobre o perfil comportamental da pessoa em equipe",
      "objetivoPastoral": "O que o líder deve observar"
    },
    {
      "topico": "Cuidado com o Ponto Cego",
      "pergunta": "Pergunta aberta acolhedora sobre como ela lida com sua área de menor afinidade/energia",
      "objetivoPastoral": "O que o líder deve observar para não sobrecarregá-la"
    }
  ],
  "alertas": ["destaque ou ponto de atenção 1", "destaque 2"],
  "proximosPassos": ["próximo passo concreto 1", "próximo passo 2", "próximo passo 3"]
}`;

    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt,
      config: { temperature: 0.7 },
    });

    let analysis: any;
    try {
      const text = response.text || '';
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = text.substring(firstBrace, lastBrace + 1);
        analysis = JSON.parse(jsonStr);
      } else {
        const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
        analysis = JSON.parse(cleanedText);
      }
    } catch {
      analysis = {
        resumoServidor: response.text,
        areasRecomendadas: [],
        comoComunicar: [],
        comoGerenciar: [],
        evitar: [],
        perguntasEntrevista: [],
        alertas: [],
        proximosPassos: [],
      };
    }

    if (!Array.isArray(analysis.areasRecomendadas)) analysis.areasRecomendadas = [];
    if (!Array.isArray(analysis.comoComunicar)) analysis.comoComunicar = [];
    if (!Array.isArray(analysis.comoGerenciar)) analysis.comoGerenciar = [];
    if (!Array.isArray(analysis.evitar)) analysis.evitar = [];
    if (!Array.isArray(analysis.perguntasEntrevista)) analysis.perguntasEntrevista = [];
    if (!Array.isArray(analysis.alertas)) analysis.alertas = [];
    if (!Array.isArray(analysis.proximosPassos)) analysis.proximosPassos = [];

    analysis.generatedAt = new Date().toISOString();

    // Salva no Firestore se tiver resultId
    if (resultId) {
      const db = getAdminDb();
      await db.collection('shape_results').doc(resultId).update({
        aiAnalysis: { ...analysis, generatedAt: Timestamp.now() },
      });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (e: any) {
    console.error('analyze-shape error:', e);
    return NextResponse.json({ error: e.message || 'Erro na análise' }, { status: 500 });
  }
}
