'use server';

import { z } from 'zod';
import { runUserProfileAnalysis } from '@/ai/flows/user-profile-analysis-flow';

export type AIState = {
  message: string | null;
  analysis: string | null;
  error: string | null;
};

const AnalysisSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
  question: z.string().min(5, 'A pergunta deve ter pelo menos 5 caracteres.'),
});

export async function getAIAnalysis(prevState: AIState, formData: FormData): Promise<AIState> {
  const validatedFields = AnalysisSchema.safeParse({
    userId: formData.get('userId'),
    question: formData.get('question'),
  });

  if (!validatedFields.success) {
      const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
      return {
          message: null,
          analysis: null,
          error: firstError || 'Dados inválidos.',
      };
  }

  try {
    const analysisText = await runUserProfileAnalysis(validatedFields.data);
    if (analysisText) {
      return { message: 'Análise concluída.', analysis: analysisText, error: null };
    }
    return { message: null, analysis: null, error: 'A IA não retornou uma análise. Tente novamente.' };
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    return { message: null, analysis: null, error: 'Ocorreu um erro no servidor ao gerar a análise.' };
  }
}
