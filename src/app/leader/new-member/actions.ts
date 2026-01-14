
'use server';

import { z } from 'zod';
import { generateNewMemberFollowUpTasks } from '@/ai/flows/new-member-follow-up-tasks';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

// This schema should match the one in the AI flow, but with added validation messages.
const NewMemberInfoSchema = z.object({
  visitorName: z.string().min(2, { message: 'O nome do visitante deve ter pelo menos 2 caracteres.' }),
  visitorType: z.enum(['culto', 'celula'], { required_error: 'Por favor, selecione a origem do visitante.' }),
  leaderName: z.string().min(2, { message: 'O nome do líder deve ter pelo menos 2 caracteres.' }),
  leaderPhoneNumber: z.string().min(10, { message: 'Por favor, insira um número de telefone válido.' }),
});

export type State = {
  errors?: {
    visitorName?: string[];
    visitorType?: string[];
    leaderName?: string[];
    leaderPhoneNumber?: string[];
  };
  message?: string | null;
  tasks?: { message: string; dueDate: string; }[];
};

async function saveVisitorToFirestore(visitorData: z.infer<typeof NewMemberInfoSchema>) {
    // We can't use hooks here, so we initialize a server-side instance of Firebase.
    const { firestore } = initializeFirebase();
    const usersCollection = collection(firestore, 'users');

    try {
        const newUserDoc = await addDoc(usersCollection, {
            name: visitorData.visitorName,
            phone: visitorData.leaderPhoneNumber, // Assuming leader's phone is a placeholder for visitor's contact for now
            email: '', // Email is not collected in this form
            hierarchy: {
                role: '', // No role assigned initially
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
    leaderName: formData.get('leaderName'),
    leaderPhoneNumber: formData.get('leaderPhoneNumber'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Campos inválidos. Por favor, corrija os erros e tente novamente.',
    };
  }

  // First, save the visitor to Firestore
  const saveResult = await saveVisitorToFirestore(validatedFields.data);
  if (!saveResult.success) {
      return { message: saveResult.error };
  }

  // Then, generate AI tasks
  try {
    const result = await generateNewMemberFollowUpTasks(validatedFields.data);
    if (result && result.followUpTasks) {
      return { message: 'Visitante registrado e tarefas de acompanhamento geradas com sucesso!', tasks: result.followUpTasks };
    }
    return { message: 'Visitante registrado, mas não foi possível gerar as tarefas. A resposta da IA estava vazia. Tente novamente.' };
  } catch (error) {
    console.error('Error generating follow-up tasks:', error);
    return { message: 'Visitante registrado, mas ocorreu um erro no servidor ao gerar as tarefas. Verifique o console para mais detalhes.' };
  }
}
