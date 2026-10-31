import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({ plugins: [googleAI()] });

export async function POST(req: NextRequest) {
  try {
    const { resultId, shapeData } = await req.json();
    if (!shapeData) return NextResponse.json({ error: 'Dados obrigatórios' }, { status: 400 });

    const prompt = `Você é um pastor e orientador ministerial sênior da Oiko Comunidade, em São Gonçalo/RJ.
Analise o perfil S.H.A.P.E. completo abaixo (com metodologia comportamental DISC e dons espirituais) e gere uma recomendação personalizada, empática e estratégica para a liderança pastoral guiar e acolher esta pessoa.

IMPORTANTE: Não se limite a áreas que existam formalmente. Baseie-se nos dons, habilidades, perfil comportamental DISC e sonhos da pessoa para sugerir áreas novas ou combinações criativas.

Perfil do Voluntário:
- Nome: ${shapeData.nome}
- Perfil Comportamental DISC:
  * Perfil Primário: ${shapeData.discPrimary || 'Não avaliado via DISC'}
  * Perfil Secundário: ${shapeData.discSecondary || 'Não avaliado'}
  * Pontuações DISC: ${shapeData.discScores ? JSON.stringify(shapeData.discScores) : 'Sem pontuação'}
  * Quadrante (Legado/Referência): ${shapeData.quadrante || 'Não informado'}
- Top 3 Dons Espirituais: ${shapeData.top3?.map((d: any) => (d.nome || d.name) + ' (' + d.score + 'pts)').join(', ') || 'Não avaliados'}
- Área onde sente chamado para servir: ${shapeData.ministryTarget || 'Não especificada'}
- Profissão/Formação: ${shapeData.profissao || shapeData.formacao || 'Não informado'}
- Habilidades Profissionais: ${(shapeData.habilidades || []).join(', ') || 'Não informadas'}
- Sonhos e Coração:
${Object.entries(shapeData.coracao || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  Não preenchido'}
- Experiências e Disponibilidade:
${Object.entries(shapeData.experiencias || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  Não preenchido'}

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
        alertas: [],
        proximosPassos: [],
      };
    }

    if (!Array.isArray(analysis.areasRecomendadas)) analysis.areasRecomendadas = [];
    if (!Array.isArray(analysis.comoComunicar)) analysis.comoComunicar = [];
    if (!Array.isArray(analysis.comoGerenciar)) analysis.comoGerenciar = [];
    if (!Array.isArray(analysis.evitar)) analysis.evitar = [];
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
