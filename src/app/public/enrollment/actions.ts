
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

/**
 * Server Action para verificar se um membro existe e retornar dados mascarados.
 * Utiliza o Client SDK no servidor para evitar problemas de permissão em ambiente Server Action.
 */
export async function verifyMemberEmail(email: string) {
    if (!email) return { exists: false };
    
    // Inicializa o Firebase no contexto do servidor
    const { firestore } = initializeFirebase();
    if (!firestore) return { exists: false, error: 'Banco de dados offline' };

    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email.trim().toLowerCase()), limit(1));
    
    try {
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Funções de máscara para privacidade
            const maskName = (name: string) => {
                const parts = name.split(' ');
                return parts.map(p => {
                    if (p.length <= 1) return p;
                    return p[0] + '*'.repeat(p.length - 1);
                }).join(' ');
            };
            
            const maskPhone = (phone: string) => {
                if (!phone) return 'Não informado';
                const cleaned = phone.replace(/\D/g, '');
                if (cleaned.length < 4) return '***';
                // Máscara estilo: (21) *****-88
                return `(${cleaned.substring(0, 2)}) *****-${cleaned.substring(cleaned.length - 2)}`;
            };

            return {
                exists: true,
                userId: userDoc.id,
                maskedName: maskName(userData.name || 'Membro'),
                maskedPhone: maskPhone(userData.phone || '')
            };
        }
    } catch (error: any) {
        console.error("Erro na verificação de e-mail:", error);
        return { exists: false, error: error.message };
    }
    
    return { exists: false };
}
