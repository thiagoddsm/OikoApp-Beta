
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

/**
 * Utilitário para mascarar o nome (Ex: João Silva -> J*** S****)
 */
function maskName(name: string): string {
    if (!name) return "";
    const parts = name.trim().split(' ');
    return parts.map(part => {
        if (part.length <= 1) return part;
        return part.charAt(0) + '*'.repeat(part.length - 1);
    }).join(' ');
}

/**
 * Utilitário para mascarar o telefone (Ex: 21999998888 -> (21) *****-88)
 */
function maskPhone(phone: string): string {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return phone;
    
    const ddd = digits.substring(0, 2);
    const lastTwo = digits.substring(digits.length - 2);
    
    return `(${ddd}) *****-**${lastTwo}`;
}

/**
 * Verifica se um e-mail pertence a um membro cadastrado.
 * Retorna os dados mascarados por segurança.
 */
export async function verifyMemberEmail(email: string) {
    try {
        const { firestore } = initializeFirebase();
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase()), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            
            return {
                success: true,
                member: {
                    id: userDoc.id,
                    name: maskName(data.name || ''),
                    phone: maskPhone(data.phone || '')
                }
            };
        }

        return { success: false, message: "Membro não encontrado" };
    } catch (error) {
        console.error("Error verifying member email:", error);
        return { success: false, message: "Erro ao consultar banco de dados" };
    }
}
