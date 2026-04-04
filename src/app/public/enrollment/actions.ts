
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Inicialização robusta do Firebase Admin para uso em Server Actions
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
function maskName(name: string): string {
  if (!name) return "";
  return name.split(' ').map(word => {
    if (word.length <= 1) return word;
    return word[0] + '*'.repeat(word.length - 1);
  }).join(' ');
}

/**
 * Utilitário para mascarar o telefone (Ex: 21999998888 -> (21) *****-88)
 */
function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return "****-****";
  const lastTwo = cleaned.slice(-2);
  const ddd = cleaned.slice(0, 2);
  return `(${ddd}) *****-${lastTwo}`;
}

/**
 * Verifica se o e-mail pertence a um membro e retorna dados mascarados para privacidade
 */
export async function verifyMemberEmail(email: string) {
  if (!email) return { exists: false };

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
      userId: snapshot.docs[0].id,
      maskedName: maskName(userData.name || ""),
      maskedPhone: maskPhone(userData.phone || ""),
    };
  } catch (error) {
    console.error("Error verifying email:", error);
    return { exists: false, error: "Erro na verificação" };
  }
}

/**
 * Submete o protocolo de inscrição de forma segura.
 * Se for um membro existente (ID fornecido), busca os dados REAIS no servidor para evitar salvar asteriscos.
 */
export async function submitEnrollmentRequest(data: {
    courseId: string;
    classId?: string;
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
}) {
    const db = getDb();
    const requestsRef = db.collection('enrollment_requests');

    let finalData = {
        courseId: data.courseId,
        classId: data.classId || "",
        status: 'pending',
        createdAt: new Date(),
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        userId: data.userId || null
    };

    // Se identificamos um usuário, ignoramos os campos de texto do cliente (que podem estar mascarados)
    // e pegamos o valor real do banco de dados
    if (data.userId) {
        const userDoc = await db.collection('users').doc(data.userId).get();
        if (userDoc.exists) {
            const realUser = userDoc.data()!;
            finalData.name = realUser.name || finalData.name;
            finalData.email = realUser.email || finalData.email;
            finalData.phone = realUser.phone || finalData.phone;
        }
    }

    try {
        await requestsRef.add(finalData);
        return { success: true };
    } catch (error) {
        console.error("Error submitting request:", error);
        return { success: false, error: "Falha ao registrar protocolo" };
    }
}
