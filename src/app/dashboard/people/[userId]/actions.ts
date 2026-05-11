'use server';

import { revalidatePath } from 'next/cache';
import { Person } from '@/types/person';
import { Timestamp } from 'firebase-admin/firestore';
import { runUserProfileAnalysis } from '@/ai/flows/user-profile-analysis-flow';

// START: Firebase Admin Initialization
import { getAdminDb } from '@/lib/firebase-admin';

const db = getAdminDb();
// END: Firebase Admin Initialization

export async function updatePerson(person: Person) {
  if (!person.id) {
    throw new Error('O ID da pessoa é necessário para a atualização.');
  }

  const { id, ...personData } = person;

  const convertToAdminTypes = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
      return data.map(convertToAdminTypes);
    }
    if (typeof data === 'object' && data !== null) {
      if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
        return new Timestamp(data.seconds, data.nanoseconds);
      }
      const newObj: { [key: string]: any } = {};
      for (const key of Object.keys(data)) {
        newObj[key] = convertToAdminTypes(data[key]);
      }
      return newObj;
    }
    return data;
  };

  const personToUpdate = convertToAdminTypes(personData);

  try {
    const personRef = db.collection('users').doc(id);
    await personRef.update(personToUpdate);

    // Sincronizar identidade do WhatsApp se houver telefone (em segundo plano)
    if (personToUpdate.phone) {
        import('@/app/actions/wa-resolution').then(({ syncUserWAIdentity }) => {
            syncUserWAIdentity(id, personToUpdate.phone).catch(e => console.warn("WA Sync Error:", e));
        });
    }

    revalidatePath(`/dashboard/people/${id}`);
    return { success: true, message: 'Pessoa atualizada com sucesso.' };
  } catch (error) {
    console.error('Erro ao atualizar a pessoa:', error);
    return { success: false, message: 'Falha ao atualizar o perfil.' };
  }
}

export type AIState = {
  message: string | null;
  analysis: string | null;
  error: string | null;
};

export async function getAIAnalysis(prevState: AIState, formData: FormData): Promise<AIState> {
  const userId = formData.get('userId') as string;
  const question = formData.get('question') as string;

  if (!userId || !question) {
    return { ...prevState, error: 'Usuário ou pergunta inválidos.' };
  }

  try {
    const analysis = await runUserProfileAnalysis({ userId, question });
    return { message: 'Análise concluída.', analysis, error: null };
  } catch (error: any) {
    console.error('AI Analysis error:', error);
    return { ...prevState, error: 'Falha ao processar a análise via IA.' };
  }
}
