'use server';

import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

/**
 * Verifica se um e-mail já possui cadastro no sistema.
 * Executado no servidor para evitar a necessidade de permissão de leitura pública na coleção 'users'.
 */
export async function verifyMemberEmail(email: string) {
  if (!email || !email.includes('@')) {
    return { success: false, message: 'E-mail inválido.' };
  }

  try {
    const { firestore } = initializeFirebase();
    const q = query(
      collection(firestore, 'users'),
      where('email', '==', email.trim().toLowerCase()),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return {
        success: true,
        isMember: true,
        user: {
          id: querySnapshot.docs[0].id,
          name: userData.name,
          phone: userData.phone
        }
      };
    }
    
    return { success: true, isMember: false };
  } catch (error) {
    console.error('Error verifying email:', error);
    return { success: false, message: 'Erro ao verificar e-mail no servidor.' };
  }
}
