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

    const prompt = `Você é um pastor e orientador ministerial da Oiko Comunidade, em São Gonçalo/RJ.
Analise o perfil S.H.A.P.E. abaixo e gere uma recomendação personalizada de onde esta pessoa pode servir.

IMPORTANTE: Não se limite a áreas que existam formalmente. Baseie-se nos dons, habilidades e sonhos da pessoa para sugerir áreas novas ou combinações criativas.

Perfil:
- Nome: ${shapeData.nome}
- Quadrante de Personalidade: ${shapeData.quadrante}
- Top 3 Dons Espirituais: ${shapeData.top3?.map((d: any) => d.nome + ' (' + d.score + 'pts)').join(', ')}
- Profissão/Formação: ${shapeData.profissao || 'Não informado'}
- Habilidades Profissionais: ${(shapeData.habilidades || []).join(', ') || 'Não informadas'}
- Sonhos e Coração:
${Object.entries(shapeData.coracao || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

Responda em JSON válido com esta estrutura exata:
{
  "resumoServidor": "2-3 parágrafos sobre o perfil único desta pessoa",
  "areasRecomendadas": ["área 1", "área 2", "área 3"],
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
      const text = response.text.replace(/```json\n?|```\n?/g, '').trim();
      analysis = JSON.parse(text);
    } catch {
      analysis = { resumoServidor: response.text, areasRecomendadas: [], alertas: [], proximosPassos: [] };
    }

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
