'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Resolve o perfil do usuário no Firestore após qualquer autenticação.
 *
 * Estratégia (Opção A — Migração para users/{uid}):
 * 1. Se users/{uid} já existe → apenas atualiza lastLoginAt.
 * 2. Busca por e-mail na coleção users → se encontrar doc com ID diferente:
 *    → Cria users/{uid} com os dados do doc encontrado (preserva role, célula, etc.)
 *    → Marca o doc antigo como migrado: { migratedToUid, migratedAt }
 * 3. Se não encontrar nenhum perfil → cria users/{uid} mínimo (aguarda aprovação admin).
 */
export async function resolveUserProfile(params: {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: 'google' | 'email' | 'unknown';
}): Promise<{
  action: 'existing' | 'linked' | 'created';
  linkedFromDocId?: string;
}> {
  const { uid, email, displayName, provider } = params;

  try {
    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    // 1. Documento com o UID já existe — apenas atualiza lastLoginAt
    if (userSnap.exists) {
      await userRef.update({
        lastLoginAt: FieldValue.serverTimestamp(),
        // Sincroniza dados do Auth caso tenham mudado
        ...(email ? { email } : {}),
        ...(displayName ? { name: displayName } : {}),
      });
      return { action: 'existing' };
    }

    // 2. Busca por e-mail para encontrar perfil pré-existente com outro ID
    if (email) {
      const byEmailSnap = await db
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!byEmailSnap.empty) {
        const oldDoc = byEmailSnap.docs[0];
        const oldDocId = oldDoc.id;

        // Não migrar se já é o próprio UID (situação improvável mas defensiva)
        if (oldDocId !== uid) {
          const oldData = oldDoc.data();

          // Cria users/{uid} com os dados do perfil pré-existente
          await userRef.set({
            ...oldData,
            // Garante que e-mail e nome do Auth estejam atualizados
            email: email || oldData.email || '',
            name: displayName || oldData.name || 'Sem nome',
            authUid: uid,
            linkedFrom: oldDocId,
            linkedAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
          });

          // Marca o documento antigo como migrado (não deleta para preservar histórico)
          await db.collection('users').doc(oldDocId).update({
            migratedToUid: uid,
            migratedAt: FieldValue.serverTimestamp(),
          });

          console.log(
            `[resolveUserProfile] Perfil migrado: ${oldDocId} → users/${uid} (${provider})`
          );
          return { action: 'linked', linkedFromDocId: oldDocId };
        }
      }
    }

    // 3. Nenhum perfil encontrado — cria documento mínimo
    const usersCountSnap = await db.collection('users').limit(1).get();
    const isFirstUser = usersCountSnap.empty;

    await userRef.set({
      name: displayName || 'Novo Usuário',
      email: email || '',
      phone: '',
      hierarchy: {
        role: isFirstUser ? 'admin' : '',
      },
      integrationStatus: 'nao_alcancado',
      authUid: uid,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });

    console.log(`[resolveUserProfile] Novo perfil criado: users/${uid} (${provider})`);
    return { action: 'created' };
  } catch (error: any) {
    console.error('[resolveUserProfile] Erro:', error);
    // Em caso de erro, não bloquear o login — o provider.tsx atualizará lastLoginAt
    throw new Error(error.message || 'Erro ao resolver perfil do usuário.');
  }
}

/**
 * @deprecated Use resolveUserProfile no lugar.
 * Mantido para compatibilidade com o fluxo "Primeiro Acesso" por email/senha.
 *
 * Verifica se o e-mail já existe no Firestore e, se sim, cria o usuário no Auth
 * com o mesmo UID do documento (vinculando Auth ao perfil pré-existente).
 */

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

/**
 * Corrige perfis duplicados: mescla o documento antigo (com dados completos)
 * no documento novo (criado pelo Auth UID), preservando todos os dados do perfil original.
 *
 * Use para corrigir casos onde o login via Google criou um doc novo antes do bug ser corrigido.
 *
 * @param authUid  - UID do Firebase Auth (ID do doc novo/incompleto, ex: "QpjG...")
 * @param oldDocId - ID do doc antigo com os dados completos (ex: "VNhi...")
 */
export async function mergeUserProfiles(authUid: string, oldDocId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!authUid || !oldDocId) {
      return { success: false, message: 'authUid e oldDocId são obrigatórios.' };
    }
    if (authUid === oldDocId) {
      return { success: false, message: 'Os IDs não podem ser iguais.' };
    }

    const db = getAdminDb();
    const newRef = db.collection('users').doc(authUid);
    const oldRef = db.collection('users').doc(oldDocId);

    const [newSnap, oldSnap] = await Promise.all([newRef.get(), oldRef.get()]);

    if (!newSnap.exists) {
      return { success: false, message: `Documento users/${authUid} não encontrado.` };
    }
    if (!oldSnap.exists) {
      return { success: false, message: `Documento users/${oldDocId} não encontrado.` };
    }

    const oldData = oldSnap.data()!;
    const newData = newSnap.data()!;

    // Mescla: dados do doc antigo têm prioridade (preserva role, célula, jornada etc.)
    // Mantém apenas lastLoginAt do doc novo (mais recente)
    const mergedData = {
      ...newData,        // base: dados do doc novo (email, name do Auth, lastLoginAt)
      ...oldData,        // sobrescreve com dados completos do perfil antigo
      email: oldData.email || newData.email || '',
      name: oldData.name || newData.name || '',
      lastLoginAt: newData.lastLoginAt || oldData.lastLoginAt || FieldValue.serverTimestamp(),
      authUid: authUid,
      linkedFrom: oldDocId,
      linkedAt: FieldValue.serverTimestamp(),
      mergedByAdmin: true,
    };

    // Remove campos de migração se o doc antigo já era um migrado
    delete mergedData.migratedToUid;
    delete mergedData.migratedAt;

    await newRef.set(mergedData);

    // Marca doc antigo como migrado
    await oldRef.update({
      migratedToUid: authUid,
      migratedAt: FieldValue.serverTimestamp(),
      mergedByAdmin: true,
    });

    console.log(`[mergeUserProfiles] Perfis mesclados: ${oldDocId} → users/${authUid}`);
    return {
      success: true,
      message: `Perfil mesclado com sucesso. Dados de "${oldDocId}" foram copiados para "users/${authUid}".`,
    };
  } catch (error: any) {
    console.error('[mergeUserProfiles] Erro:', error);
    return { success: false, message: error.message || 'Erro ao mesclar perfis.' };
  }
}
