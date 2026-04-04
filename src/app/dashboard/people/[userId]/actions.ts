'use server';

import { revalidatePath } from 'next/cache';
import { Person } from '@/types/person';
import { Timestamp } from 'firebase-admin/firestore';
import { runUserProfileAnalysis } from '@/ai/flows/user-profile-analysis-flow';

// START: Firebase Admin Initialization
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : undefined,
    });
  } catch (e) {
    console.error('Firebase Admin initialization error', e);
  }
}

const db = getFirestore();
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
