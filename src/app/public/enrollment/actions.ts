'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Inicializa o Firebase Admin de forma segura no servidor.
 */
function getAdminDb() {
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
  return getFirestore();
}

/**
 * Utilitário para mascarar o nome (Ex: João Silva -> J*** S****)
 */
function maskName(name: string): string {
  if (!name) return 'Membro IBM';
  const parts = name.split(' ');
  return parts.map(p => p.length > 1 ? p[0] + '*'.repeat(p.length - 1) : p).join(' ');
}

/**
 * Utilitário para mascarar o telefone (Ex: 21999998888 -> (21) *****-8888)
 */
function maskPhone(phone: string): string {
  if (!phone) return 'Telefone não informado';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const lastFour = digits.slice(-4);
  const hidden = '*'.repeat(digits.length - 4);
  return `(${digits.slice(0, 2)}) ${hidden.slice(2)}-${lastFour}`;
}

/**
 * Verifica se um e-mail já existe na base de usuários e retorna dados mascarados.
 * Rodando no servidor para contornar regras de permissão do cliente.
 */
export async function verifyMemberEmail(email: string) {
  try {
    const db = getAdminDb();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

    if (snapshot.empty) {
      return { exists: false };
    }

    const userData = snapshot.docs[0].data();
    return {
      exists: true,
      member: {
        id: snapshot.docs[0].id,
        name: maskName(userData.name),
        phone: maskPhone(userData.phone || '')
      }
    };
  } catch (error) {
    console.error("Error verifying email in Server Action:", error);
    throw new Error("Falha na verificação do servidor.");
  }
}
