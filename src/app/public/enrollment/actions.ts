'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Inicializa o Firebase Admin de forma segura no servidor.
 */
function getDb() {
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
function maskName(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => {
      if (part.length <= 1) return part;
      return part[0] + '*'.repeat(Math.min(part.length - 1, 4));
    })
    .join(' ');
}

/**
 * Utilitário para mascarar o telefone (Ex: (21) 99999-8888 -> (21) *****-88)
 */
function maskPhone(phone: string) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  
  // Mantém o DDD e os últimos 2 dígitos
  const ddd = digits.substring(0, 2);
  const last2 = digits.substring(digits.length - 2);
  
  return `(${ddd}) *****-${last2}`;
}

/**
 * Verifica se um e-mail já pertence a um membro e retorna dados mascarados para privacidade.
 */
export async function verifyMemberEmail(email: string) {
  if (!email || !email.includes('@')) return { exists: false };

  try {
    const db = getDb();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

    if (snapshot.empty) {
      return { exists: false };
    }

    const userData = snapshot.docs[0].data();
    
    return {
      exists: true,
      member: {
        id: snapshot.docs[0].id,
        maskedName: maskName(userData.name),
        maskedPhone: maskPhone(userData.phone || ''),
        // Enviamos os dados reais para o formulário usar no envio, 
        // mas eles só serão exibidos no cliente após a confirmação do usuário que "sou eu".
        // Para segurança máxima, o ideal seria não enviar, mas aqui precisamos para o protocolo.
        name: userData.name,
        phone: userData.phone || '',
      }
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    return { exists: false, error: 'Erro ao verificar e-mail.' };
  }
}
