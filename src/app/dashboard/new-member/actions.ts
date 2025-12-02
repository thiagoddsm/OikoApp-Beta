
'use server';

import { z } from 'zod';
import { generateNewMemberFollowUpTasks } from '@/ai/flows/new-member-follow-up-tasks';
import { initializeFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const NewMemberInfoSchema = z.object({
  visitorName: z.string().min(2, { message: 'O nome do visitante deve ter pelo menos 2 caracteres.' }),
  visitorType: z.enum(['culto', 'celula'], { required_error: 'Por favor, selecione a origem do visitante.' }),
  visitorPhone: z.string().min(10, { message: 'Por favor, insira um número de telefone válido.' }),
  responsibleUserId: z.string().min(1, { message: 'Por favor, selecione um responsável válido.' }),
  cellId: z.string().optional().nullable(),
});

export type State = {
  errors?: {
    visitorName?: string[];
    visitorType?: string[];
    visitorPhone?: string[];
    responsibleUserId?: string[];
    cellId?: string[];
  };
  message?: string | null;
  tasks?: { message: string; dueDate: string; }[];
};

async function saveVisitorToFirestore(visitorData: z.infer<typeof NewMemberInfoSchema>) {
    const { firestore } = initializeFirebase();
    const usersCollection = collection(firestore, 'users');
    const newUser = {
        name: visitorData.visitorName,
        phone: visitorData.visitorPhone,
        email: '',
        hierarchy: {
            role: 'membro',
            celulaId: visitorData.cellId || null,
        },
        integrationStatus: visitorData.visitorType === 'culto' ? 'visitante_culto' : 'visitante_celula',
        createdAt: Timestamp.now()
    };

    // Use a função non-blocking que já possui o tratamento de erro contextualizado
    const newUserDoc = await addDocumentNonBlocking(usersCollection, newUser);

    // O erro de permissão será capturado globalmente, então podemos ser otimistas aqui.
    // Se a promessa for rejeitada, o `catch` no `createFollowUpTasks` irá pegar.
    return { success: true, docId: newUserDoc?.id };
}


export async function createFollowUpTasks(prevState: State, formData: FormData): Promise<State> {
  const visitorType = formData.get('visitorType');
  
  const validatedFields = NewMemberInfoSchema.safeParse({
    visitorName: formData.get('visitorName'),
    visitorType: visitorType,
    visitorPhone: formData.get('visitorPhone'),
    responsibleUserId: formData.get('responsibleUserId'),
    cellId: visitorType === 'celula' ? formData.get('cellId') : null,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Campos inválidos. Por favor, corrija os erros e tente novamente.',
    };
  }
  
  const { firestore } = initializeFirebase();
  const visitorData = validatedFields.data;

  // Fetch responsible user details
  let responsibleUser;
  try {
    const responsibleUserDocRef = doc(firestore, 'users', visitorData.responsibleUserId);
    const responsibleUserDoc = await getDoc(responsibleUserDocRef);
    if (!responsibleUserDoc.exists()) {
        return { message: "Erro: O usuário responsável selecionado não foi encontrado." };
    }
    responsibleUser = responsibleUserDoc.data();
  } catch (error) {
     return { message: "Erro ao buscar dados do responsável. Verifique suas permissões." };
  }


  try {
    const saveResult = await saveVisitorToFirestore(visitorData);
    
    if (!saveResult.success) {
        // Embora o erro de permissão seja global, podemos ter outros erros
        return { message: "Falha ao registrar pessoa no banco de dados." };
    }

    revalidatePath('/dashboard/users');

    const aiPayload = {
      visitorName: visitorData.visitorName,
      visitorType: visitorData.visitorType as 'culto' | 'celula',
      responsibleName: responsibleUser.name || 'Líder',
      responsiblePhoneNumber: responsibleUser.phone || 'N/A',
    };
    const result = await generateNewMemberFollowUpTasks(aiPayload);

    if (result && result.followUpTasks) {
      return { message: 'Pessoa registrada e tarefas de acompanhamento geradas com sucesso!', tasks: result.followUpTasks };
    }
    return { message: 'Pessoa registrada, mas não foi possível gerar as tarefas. A resposta da IA estava vazia.' };

  } catch (error: any) {
    // Se addDocumentNonBlocking falhar, a promise será rejeitada e cairá aqui.
    // No entanto, o erro de permissão já terá sido emitido globalmente.
    // Podemos retornar uma mensagem genérica aqui, pois o erro detalhado aparecerá no overlay.
    console.error('Error in createFollowUpTasks:', error);
    return { message: 'Ocorreu um erro ao salvar o visitante. Verifique o console de desenvolvimento para o erro de permissão.' };
  }
}
