'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export async function registerOrLinkUser(email: string, password: string, name: string) {
    try {
        const db = getAdminDb();
        const auth = getAdminAuth();
        
        // 1. Verificar se o email já existe na collection 'users'
        const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        
        if (!usersSnapshot.empty) {
            const existingUserDoc = usersSnapshot.docs[0];
            const existingDocId = existingUserDoc.id;

            // Verificar se já tem usuário no Firebase Auth
            try {
                await auth.getUserByEmail(email);
                // Se não der erro, significa que já existe no Auth
                return { success: false, code: 'auth/email-already-in-use' };
            } catch (authError: any) {
                if (authError.code === 'auth/user-not-found') {
                    // O e-mail está na base, mas NÃO tem senha ainda!
                    // Cria o usuário no Auth com o exato MESMO UID do documento
                    await auth.createUser({
                        uid: existingDocId,
                        email: email,
                        password: password,
                        displayName: name
                    });
                    
                    // Retorna sucesso e a flag indicando que vinculou,
                    // para o cliente apenas fazer o login normal.
                    return { success: true, linked: true };
                }
                throw authError;
            }
        }

        // Não encontrou na base, o cliente pode prosseguir normal
        return { success: true, linked: false };

    } catch (error: any) {
        console.error('registerOrLinkUser error:', error);
        return { success: false, error: error.message };
    }
}
