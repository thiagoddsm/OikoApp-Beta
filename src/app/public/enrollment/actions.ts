
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

/**
 * Verifica se um e-mail já pertence a um membro cadastrado.
 * Executado no servidor para contornar restrições de leitura pública da coleção 'users'.
 */
export async function verifyMemberEmail(email: string) {
  try {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error('Firestore não inicializado.');

    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email.trim().toLowerCase()), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { exists: false };
    }

    const userData = snapshot.docs[0].data();
    return {
      exists: true,
      user: {
        id: snapshot.docs[0].id,
        name: userData.name,
        phone: userData.phone || '',
      }
    };
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return { exists: false, error: error.message || 'Falha ao verificar e-mail.' };
  }
}
