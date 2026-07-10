import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionText, studentAnswer, essayGabarito } = body;

    if (!questionText || !studentAnswer) {
      return NextResponse.json(
        { error: 'questionText e studentAnswer são obrigatórios.' },
        { status: 400 }
      );
    }

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

    const response = await ai.generate({
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
    console.error('Erro na avaliação de redação/resposta discursiva:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
