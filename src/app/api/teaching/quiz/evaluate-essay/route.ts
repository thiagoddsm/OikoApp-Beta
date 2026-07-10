import { NextResponse } from 'next/server';
import { z } from 'zod';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Carrega a chave de API do Gemini dinamicamente do banco se nao estiver no process.env
    if (!process.env.GEMINI_API_KEY) {
      try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('theoflix').get();
        let key = configSnap.exists ? configSnap.data()?.youtubeApiKey || configSnap.data()?.geminiApiKey : null;
        
        if (!key) {
          // Fallback para config geral de notificacoes
          const notifySnap = await db.collection('config').doc('notifications').get();
          key = notifySnap.exists ? notifySnap.data()?.geminiApiKey || notifySnap.data()?.googleApiKey : null;
        }

        if (key) {
          process.env.GEMINI_API_KEY = key;
        }
      } catch (errDb) {
        console.warn('Erro ao ler GEMINI_API_KEY do Firestore Admin:', errDb);
      }
    }

    const body = await request.json();
    const { questionText, studentAnswer, essayGabarito } = body;

    if (!questionText || !studentAnswer) {
      return NextResponse.json(
        { error: 'questionText e studentAnswer são obrigatórios.' },
        { status: 400 }
      );
    }

    // Inicializa o Genkit localmente e de forma dinamica usando a chave carregada
    const localAi = genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-1.5-flash', // Usa o modelo padrão rápido
    });

    const prompt = `Você é um avaliador acadêmico preciso e construtivo.
Sua tarefa é avaliar a resposta de um aluno para uma pergunta discursiva (ensaio).

Pergunta: "${questionText}"
Resposta do Aluno: "${studentAnswer}"
${
  essayGabarito
    ? `Gabarito/Critérios Sugeridos: "${essayGabarito}"`
    : 'Nota: Não há gabarito sugerido. Avalie apenas a coerência, clareza e correção da resposta em relação à pergunta.'
}

Critérios de Avaliação:
1. Atribua uma nota (score) de 0 a 100.
2. Defina "approved" como true se o score for maior ou igual a 70, e false caso contrário.
3. Forneça um feedback construtivo e sucinto em português brasileiro explicando os pontos fortes, fracos e o motivo da nota.`;

    const response = await localAi.generate({
      prompt,
      output: {
        schema: z.object({
          approved: z.boolean(),
          score: z.number().min(0).max(100),
          feedback: z.string(),
        }),
      },
    });

    if (!response.output) {
      return NextResponse.json(
        { error: 'Erro ao gerar avaliação pela IA.' },
        { status: 500 }
      );
    }

    return NextResponse.json(response.output);
  } catch (error: any) {
    console.error('Erro detalhado na avaliação de redação/resposta discursiva:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno no servidor',
        stack: error.stack || null,
        details: JSON.stringify(error, Object.getOwnPropertyNames(error))
      },
      { status: 500 }
    );
  }
}
