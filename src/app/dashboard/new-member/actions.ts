
'use server';

import { z } from 'zod';
import { generateNewMemberFollowUpTasks } from '@/ai/flows/new-member-follow-up-tasks';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

const NewMemberInfoSchema = z.object({
  visitorName: z.string().min(2, { message: 'O nome do visitante deve ter pelo menos 2 caracteres.' }),
  visitorType: z.enum(['culto', 'celula'], { required_error: 'Por favor, selecione a origem do visitante.' }),
  visitorPhone: z.string().min(10, { message: 'Por favor, insira um número de telefone válido.' }),
  responsibleUserId: z.string().min(1, { message: 'Por favor, selecione um responsável válido.' }),
});

export type State = {
  errors?: {
    visitorName?: string[];
    visitorType?: string[];
    visitorPhone?: string[];
    responsibleUserId?: string[];
  };
  message?: string | null;
  tasks?: { message: string; dueDate: string; }[];
};

async function saveVisitorToFirestore(visitorData: Pick<z.infer<typeof NewMemberInfoSchema>, 'visitorName' | 'visitorPhone' | 'visitorType'>) {
    const { firestore } = initializeFirebase();
    const usersCollection = collection(firestore, 'users');

    try {
        const newUserDoc = await addDoc(usersCollection, {
            name: visitorData.visitorName,
            phone: visitorData.visitorPhone,
            email: '', // Not a login user, so no email needed
            hierarchy: {
                role: 'membro', // Default role for any person in the system
            },
            integrationStatus: visitorData.visitorType === 'culto' ? 'visitante_culto' : 'visitante_celula',
            createdAt: Timestamp.now()
        });
        console.log("New person registered with ID: ", newUserDoc.id);
        return { success: true, docId: newUserDoc.id };
    } catch (error) {
        console.error("Error saving visitor to Firestore:", error);
        return { success: false, error: "Falha ao registrar pessoa no banco de dados." };
    }
}


export async function createFollowUpTasks(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = NewMemberInfoSchema.safeParse({
    visitorName: formData.get('visitorName'),
    visitorType: formData.get('visitorType'),
    visitorPhone: formData.get('visitorPhone'),
    responsibleUserId: formData.get('responsibleUserId'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Campos inválidos. Por favor, corrija os erros e tente novamente.',
    };
  }
  
  const { firestore } = initializeFirebase();

  // Fetch responsible user details
  const responsibleUserDocRef = doc(firestore, 'users', validatedFields.data.responsibleUserId);
  const responsibleUserDoc = await getDoc(responsibleUserDocRef);

  if (!responsibleUserDoc.exists()) {
      return { message: "Erro: O usuário responsável selecionado não foi encontrado." };
  }
  const responsibleUser = responsibleUserDoc.data();


  const { responsibleUserId, ...visitorData } = validatedFields.data;

  // This form now only registers a person (disciple), not a user with login.
  const saveResult = await saveVisitorToFirestore(visitorData);
  if (!saveResult.success) {
      return { message: saveResult.error };
  }

  try {
    const aiPayload = {
      visitorName: visitorData.visitorName,
      visitorType: visitorData.visitorType,
      responsibleName: responsibleUser.name || 'Líder',
      responsiblePhoneNumber: responsibleUser.phone || 'N/A',
    };
    const result = await generateNewMemberFollowUpTasks(aiPayload);

    if (result && result.followUpTasks) {
      return { message: 'Pessoa registrada e tarefas de acompanhamento geradas com sucesso!', tasks: result.followUpTasks };
    }
    return { message: 'Pessoa registrada, mas não foi possível gerar as tarefas. A resposta da IA estava vazia.' };
  } catch (error) {
    console.error('Error generating follow-up tasks:', error);
    return { message: 'Pessoa registrada, mas ocorreu um erro no servidor ao gerar as tarefas.' };
  }
}
