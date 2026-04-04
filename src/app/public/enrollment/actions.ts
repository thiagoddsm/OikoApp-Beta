'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Inicialização robusta do Firebase Admin no servidor.
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
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length <= 1) return part;
    return part[0] + "*".repeat(Math.min(part.length - 1, 3));
  }).join(" ");
}

/**
 * Utilitário para mascarar o telefone (Ex: 21999998888 -> (21) *****-88)
 */
function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;
  const lastTwo = cleaned.slice(-2);
  const prefix = cleaned.length > 10 ? cleaned.slice(0, 2) : "";
  return prefix ? `(${prefix}) *****-${lastTwo}` : `*****-${lastTwo}`;
}

export type VerifiedMember = {
  id: string;
  name: string;
  phone: string;
  isExisting: boolean;
};

/**
 * Verifica se um e-mail existe na base de usuários e retorna dados mascarados.
 */
export async function verifyMemberEmail(email: string): Promise<VerifiedMember | null> {
  if (!email || !email.includes('@')) return null;

  try {
    const db = getAdminDb();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

    if (snapshot.empty) {
      return { id: '', name: '', phone: '', isExisting: false };
    }

    const userData = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      name: maskName(userData.name || ""),
      phone: maskPhone(userData.phone || ""),
      isExisting: true
    };
  } catch (error) {
    console.error("Error verifying email:", error);
    throw new Error("Falha na verificação de segurança.");
  }
}
