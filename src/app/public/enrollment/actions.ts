'use server';

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

/**
 * Verifica se um e-mail já existe na coleção de usuários do sistema.
 * Executa no lado do servidor para ignorar restrições de permissão pública do Firestore.
 */
export async function verifyMemberEmail(email: string) {
  if (!email) return { exists: false };

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

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
  } catch (error) {
    console.error('Error verifying email:', error);
    return { exists: false, error: 'Erro ao verificar e-mail' };
  }
}
