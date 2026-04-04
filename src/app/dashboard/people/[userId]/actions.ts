
'use server';

import { revalidatePath } from 'next/cache';
import { Person } from '@/types/person';
import { Timestamp } from 'firebase-admin/firestore';

// START: Firebase Admin Initialization
// Esta seção inicializa o Firebase Admin SDK para permitir a comunicação segura com o Firestore no servidor.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Garante que a inicialização ocorra apenas uma vez (padrão singleton)
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

/**
 * Atualiza os dados de uma pessoa no Firestore usando o Firebase Admin SDK.
 * @param person - O objeto completo da pessoa, incluindo o ID.
 */
export async function updatePerson(person: Person) {
  if (!person.id) {
    throw new Error('O ID da pessoa é necessário para a atualização.');
  }

  const { id, ...personData } = person;

  // Converte objetos de Timestamp do cliente para Timestamps do Admin SDK para garantir compatibilidade.
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
    if (error instanceof Error) {
      return { success: false, message: `Falha ao atualizar a pessoa: ${error.message}` };
    }
    return { success: false, message: 'Ocorreu um erro desconhecido ao atualizar a pessoa.' };
  }
}
