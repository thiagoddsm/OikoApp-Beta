'use server';

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialização do Firebase Admin (necessário para consultar usuários sem restrição de Security Rules)
if (!getApps().length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : undefined,
    });
  } catch (e) {
    console.error('Admin Init Error:', e);
  }
}

const db = getFirestore();

/**
 * Utilitário para mascarar o nome (Ex: João Silva -> J*** S****)
 */
function maskName(name: string): string {
  if (!name) return '';
  return name.split(' ').map(part => {
    if (part.length <= 2) return part;
    return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
  }).join(' ');
}

/**
 * Utilitário para mascarar o telefone (Ex: 21999998888 -> (21) *****-88)
 */
function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const area = digits.slice(0, 2);
  const last = digits.slice(-2);
  return `(${area}) *****-**${last}`;
}

/**
 * Verifica se um e-mail existe na base de usuários e retorna dados mascarados.
 */
export async function verifyMemberEmail(email: string) {
  if (!email) return { found: false };

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.trim().toLowerCase()).limit(1).get();

    if (snapshot.empty) {
      return { found: false };
    }

    const userData = snapshot.docs[0].data();
    return {
      found: true,
      maskedName: maskName(userData.name),
      maskedPhone: maskPhone(userData.phone),
      userId: snapshot.docs[0].id
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    return { found: false, error: 'Erro ao verificar e-mail.' };
  }
}
