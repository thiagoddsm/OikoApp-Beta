'use server';

import { generateGcRoteiroWithGemini, type GcRoteiroGeneratorInput, type GcRoteiroGeneratorOutput } from '@/ai/flows/gc-roteiro-generator-flow';

/**
 * Server Action para gerar roteiro de GC a partir de áudio ou texto usando Gemini 2.5 Flash.
 */
export async function generateGcRoteiroAction(input: GcRoteiroGeneratorInput): Promise<GcRoteiroGeneratorOutput> {
  try {
    if (!input.audioBase64 && !input.textOutline?.trim()) {
      return {
        success: false,
        title: '',
        date: '',
        htmlContent: '',
        error: 'Por favor, envie um arquivo de áudio ou cole o esboço da pregação.',
      };
    }

    return await generateGcRoteiroWithGemini(input);
  } catch (err: any) {
    console.error('[Action generateGcRoteiroAction] Erro:', err);
    return {
      success: false,
      title: '',
      date: '',
      htmlContent: '',
      error: err.message || 'Falha ao processar a geração com IA.',
    };
  }
}
