
'use server';

import { z } from 'zod';
import { generateNewMemberFollowUpTasks } from '@/ai/flows/new-member-follow-up-tasks';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const NewMemberInfoSchema = z.object({
  visitorName: z.string().min(2, { message: 'O nome do visitante deve ter pelo menos 2 caracteres.' }),
  visitorType: z.enum(['culto', 'celula'], { required_error: 'Por favor, selecione a origem do visitante.' }),
  visitorPhone: z.string().min(10, { message: 'Por favor, insira um número de telefone válido.' }),
  leaderName: z.string(), // Nome do líder vem do usuário logado
});

export type State = {
  errors?: {
    visitorName?: string[];
    visitorType?: string[];
    visitorPhone?: string[];
    leaderName?: string[];
  };
  message?: string | null;
  tasks?: { message: string; dueDate: string; }[];
};

async function saveVisitorToFirestore(visitorData: z.infer<typeof NewMemberInfoSchema>) {
    const { firestore } = initializeFirebase();
    const usersCollection = collection(firestore, 'users');

    try {
        const newUserDoc = await addDoc(usersCollection, {
            name: visitorData.visitorName,
            phone: visitorData.visitorPhone,
            email: '',
            hierarchy: {
                role: 'membro', // Default role for new entries
            },
            integrationStatus: visitorData.visitorType === 'culto' ? 'visitante_culto' : 'visitante_celula',
            createdAt: Timestamp.now()
        });
        console.log("New visitor saved with ID: ", newUserDoc.id);
        return { success: true, docId: newUserDoc.id };
    } catch (error) {
        console.error("Error saving visitor to Firestore:", error);
        return { success: false, error: "Falha ao salvar visitante no banco de dados." };
    }
}


export async function createFollowUpTasks(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = NewMemberInfoSchema.safeParse({
    visitorName: formData.get('visitorName'),
    visitorType: formData.get('visitorType'),
    visitorPhone: formData.get('visitorPhone'),
    leaderName: formData.get('leaderName'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Campos inválidos. Por favor, corrija os erros e tente novamente.',
    };
  }
  
  const saveResult = await saveVisitorToFirestore(validatedFields.data);
  if (!saveResult.success) {
      return { message: saveResult.error };
  }

  try {
    const aiPayload = {
      ...validatedFields.data,
      leaderPhoneNumber: 'N/A' // This is not needed for the message content anymore, but the flow expects it
    };
    const result = await generateNewMemberFollowUpTasks(aiPayload);

    if (result && result.followUpTasks) {
      return { message: 'Visitante registrado e tarefas de acompanhamento geradas com sucesso!', tasks: result.followUpTasks };
    }
    return { message: 'Visitante registrado, mas não foi possível gerar as tarefas. A resposta da IA estava vazia.' };
  } catch (error) {
    console.error('Error generating follow-up tasks:', error);
    return { message: 'Visitante registrado, mas ocorreu um erro no servidor ao gerar as tarefas.' };
  }
}
