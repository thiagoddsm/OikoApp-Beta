'use server';

import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Utilitário para mascarar o nome (Ex: João Silva -> J*** S****)
 */
function maskName(name: string): string {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.map(part => {
    if (part.length <= 2) return part;
    return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
  }).join(' ');
}

/**
 * Utilitário para mascarar o telefone (Ex: (21) 99999-8888 -> (21) *****-88)
 */
function maskPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  return phone.replace(/(\d{2})(\d{4,5})(\d{2})/, (_, ddd, mid, last) => `(${ddd}) ${'*'.repeat(mid.length)}-${last}`);
}

/**
 * Verifica se um e-mail já existe na base de usuários e retorna dados mascarados
 */
export async function verifyMemberEmail(email: string) {
  try {
    const { firestore } = initializeFirebase();
    const q = query(
      collection(firestore, 'users'), 
      where('email', '==', email.trim().toLowerCase()), 
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      return {
        exists: true,
        user: {
          id: userDoc.id,
          name: maskName(data.name || ''),
          phone: maskPhone(data.phone || ''),
          email: data.email
        }
      };
    }
    return { exists: false };
  } catch (error) {
    console.error("Error verifying email:", error);
    throw new Error("Não foi possível validar seu e-mail agora.");
  }
}

/**
 * Submete o protocolo de inscrição buscando dados reais se o usuário já existir
 */
export async function submitEnrollmentRequest(data: any) {
    try {
        const { firestore } = initializeFirebase();
        let finalData = { ...data, createdAt: Timestamp.now(), status: 'pending' };

        // Se for um usuário existente, buscamos os dados reais no servidor para salvar o registro correto
        if (data.userId) {
            const userRef = doc(firestore, 'users', data.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                finalData.name = userData.name;
                finalData.phone = userData.phone;
                finalData.email = userData.email;
            }
        }

        const docRef = await addDoc(collection(firestore, 'enrollment_requests'), finalData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error submitting enrollment:", error);
        throw new Error("Falha ao processar sua inscrição. Tente novamente.");
    }
}
