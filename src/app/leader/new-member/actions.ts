'use server';

import { z } from 'zod';
import { generateNewMemberFollowUpTasks } from '@/ai/flows/new-member-follow-up-tasks';

// This schema should match the one in the AI flow, but with added validation messages.
const NewMemberInfoSchema = z.object({
  visitorName: z.string().min(2, { message: 'O nome do visitante deve ter pelo menos 2 caracteres.' }),
  leaderName: z.string().min(2, { message: 'O nome do líder deve ter pelo menos 2 caracteres.' }),
  leaderPhoneNumber: z.string().min(10, { message: 'Por favor, insira um número de telefone válido.' }),
});

export type State = {
  errors?: {
    visitorName?: string[];
    leaderName?: string[];
    leaderPhoneNumber?: string[];
  };
  message?: string | null;
  tasks?: { message: string; dueDate: string; }[];
};

export async function createFollowUpTasks(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = NewMemberInfoSchema.safeParse({
    visitorName: formData.get('visitorName'),
    leaderName: formData.get('leaderName'),
    leaderPhoneNumber: formData.get('leaderPhoneNumber'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Campos inválidos. Por favor, corrija os erros e tente novamente.',
    };
  }

  try {
    const result = await generateNewMemberFollowUpTasks(validatedFields.data);
    if (result && result.followUpTasks) {
      return { message: 'Tarefas de acompanhamento geradas com sucesso!', tasks: result.followUpTasks };
    }
    return { message: 'Não foi possível gerar as tarefas. A resposta da IA estava vazia. Tente novamente.' };
  } catch (error) {
    console.error('Error generating follow-up tasks:', error);
    return { message: 'Ocorreu um erro no servidor ao gerar as tarefas. Verifique o console para mais detalhes.' };
  }
}
