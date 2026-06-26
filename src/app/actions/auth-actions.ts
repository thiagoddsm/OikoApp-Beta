'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface FirestoreOperation {
  ref: FirebaseFirestore.DocumentReference;
  data?: any;
  type: 'set' | 'update' | 'delete';
  merge?: boolean;
}

/**
 * Executa operações de gravação/exclusão no Firestore em lotes (batches) de no máximo 400 operações,
 * evitando ultrapassar o limite de 500 operações por lote do Firestore.
 */
async function commitOperationsInChunks(db: FirebaseFirestore.Firestore, operations: FirestoreOperation[]) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data || {}, { merge: op.merge });
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data || {});
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

/**
 * Realiza uma migração profunda (deep migration) de um documento de usuário antigo para um novo UID.
 * Transfere o perfil, subcoleções de anotações (notes) e atualiza todas as referências nas demais coleções.
 * No final do processo, exclui o perfil antigo para evitar duplicidades no dashboard.
 */
export async function performDeepUserMigration(
  authUid: string,
  oldDocId: string,
  extraData?: { email?: string; name?: string }
): Promise<{ success: boolean; message: string }> {
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

    if (!oldSnap.exists) {
      return { success: false, message: `Documento de origem users/${oldDocId} não encontrado.` };
    }

    const oldData = oldSnap.data()!;
    const newData = newSnap.exists ? newSnap.data()! : {};

    // 1. Mescla os dados principais do perfil
    const mergedData = {
      ...newData,
      ...oldData, 
      email: extraData?.email || oldData.email || newData.email || '',
      name: extraData?.name || oldData.name || newData.name || 'Sem nome',
      authUid: authUid,
      linkedFrom: oldDocId,
      linkedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    };

    (mergedData as Record<string, any>).migratedToUid = undefined;
    delete (mergedData as Record<string, any>).migratedToUid;
    delete (mergedData as Record<string, any>).migratedAt;

    const operations: FirestoreOperation[] = [];

    operations.push({
      ref: newRef,
      data: mergedData,
      type: 'set',
    });

    // 2. Migrar subcoleção de anotações
    const notesSnap = await oldRef.collection('notes').get();
    notesSnap.docs.forEach(noteDoc => {
      const oldNoteRef = noteDoc.ref;
      const newNoteRef = newRef.collection('notes').doc(noteDoc.id);
      
      operations.push({ ref: newNoteRef, data: noteDoc.data(), type: 'set' });
      operations.push({ ref: oldNoteRef, type: 'delete' });
    });

    // 3. Atualizar referências na coleção 'classes'
    const classesSnap = await db.collection('classes').get();
    classesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      let needsUpdate = false;
      const updates: any = {};

      if (data.teacherId === oldDocId) { updates.teacherId = authUid; needsUpdate = true; }
      if (data.students && Array.isArray(data.students) && data.students.includes(oldDocId)) {
        updates.students = data.students.map((id: string) => id === oldDocId ? authUid : id);
        needsUpdate = true;
      }
      if (data.attendance && Array.isArray(data.attendance)) {
        let attendanceChanged = false;
        const newAttendance = data.attendance.map((record: any) => {
          let recordChanged = false;
          const newRecord = { ...record };
          if (record.presentStudentIds && Array.isArray(record.presentStudentIds) && record.presentStudentIds.includes(oldDocId)) {
            newRecord.presentStudentIds = record.presentStudentIds.map((id: string) => id === oldDocId ? authUid : id);
            recordChanged = true;
          }
          if (record.onlineStudentIds && Array.isArray(record.onlineStudentIds) && record.onlineStudentIds.includes(oldDocId)) {
            newRecord.onlineStudentIds = record.onlineStudentIds.map((id: string) => id === oldDocId ? authUid : id);
            recordChanged = true;
          }
          if (record.repositions && Array.isArray(record.repositions) && record.repositions.some((r: any) => r.studentId === oldDocId)) {
            newRecord.repositions = record.repositions.map((r: any) => r.studentId === oldDocId ? { ...r, studentId: authUid } : r);
            recordChanged = true;
          }
          if (recordChanged) attendanceChanged = true;
          return newRecord;
        });
        if (attendanceChanged) { updates.attendance = newAttendance; needsUpdate = true; }
      }
      if (needsUpdate) operations.push({ ref: docSnap.ref, data: updates, type: 'update' });
    });

    // 4. Atualizar referências na coleção 'cells'
    const cellsSnap = await db.collection('cells').get();
    cellsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      let needsUpdate = false;
      const updates: any = {};
      if (data.leaderId === oldDocId) { updates.leaderId = authUid; needsUpdate = true; }
      if (data.liderCasalId === oldDocId) { updates.liderCasalId = authUid; needsUpdate = true; }
      if (data.hostId === oldDocId) { updates.hostId = authUid; needsUpdate = true; }
      if (data.anfitriaoId === oldDocId) { updates.anfitriaoId = authUid; needsUpdate = true; }
      if (data.anfitriãoCasalId === oldDocId) { updates.anfitriãoCasalId = authUid; needsUpdate = true; }
      if (data.secretariaId === oldDocId) { updates.secretariaId = authUid; needsUpdate = true; }
      if (data.membros && Array.isArray(data.membros) && data.membros.includes(oldDocId)) { updates.membros = data.membros.map((id: string) => id === oldDocId ? authUid : id); needsUpdate = true; }
      if (data.members && Array.isArray(data.members) && data.members.includes(oldDocId)) { updates.members = data.members.map((id: string) => id === oldDocId ? authUid : id); needsUpdate = true; }
      if (data.coLiderIds && Array.isArray(data.coLiderIds) && data.coLiderIds.includes(oldDocId)) { updates.coLiderIds = data.coLiderIds.map((id: string) => id === oldDocId ? authUid : id); needsUpdate = true; }
      if (data.coLideres && Array.isArray(data.coLideres)) {
        let coLideresChanged = false;
        const newCoLideres = data.coLideres.map((c: any) => {
          let cChanged = false;
          const newC = { ...c };
          if (c.id === oldDocId) { newC.id = authUid; cChanged = true; }
          if (c.casalId === oldDocId) { newC.casalId = authUid; cChanged = true; }
          if (cChanged) coLideresChanged = true;
          return newC;
        });
        if (coLideresChanged) { updates.coLideres = newCoLideres; needsUpdate = true; }
      }
      if (needsUpdate) operations.push({ ref: docSnap.ref, data: updates, type: 'update' });
    });

    // 5. Atualizar referências na coleção 'areas'
    const areasSnap = await db.collection('areas').get();
    areasSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.liderId === oldDocId) operations.push({ ref: docSnap.ref, data: { liderId: authUid }, type: 'update' });
    });

    // 6. Atualizar referências na coleção 'redes'
    const redesSnap = await db.collection('redes').get();
    redesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      let needsUpdate = false;
      const updates: any = {};
      if (data.liderId === oldDocId) { updates.liderId = authUid; needsUpdate = true; }
      if (data.pastorId === oldDocId) { updates.pastorId = authUid; needsUpdate = true; }
      if (needsUpdate) operations.push({ ref: docSnap.ref, data: updates, type: 'update' });
    });

    // 7. Atualizar presencas_historico
    const presencasSnap = await db.collection('presencas_historico').where('membroId', '==', oldDocId).get();
    presencasSnap.docs.forEach(docSnap => operations.push({ ref: docSnap.ref, data: { membroId: authUid }, type: 'update' }));

    // 8. Atualizar hierarchy.supervisorId
    const usersWithSupervisorSnap = await db.collection('users').where('hierarchy.supervisorId', '==', oldDocId).get();
    usersWithSupervisorSnap.docs.forEach(docSnap => operations.push({ ref: docSnap.ref, data: { 'hierarchy.supervisorId': authUid }, type: 'update' }));

    // 9. Atualizar notifications_contacts
    const contactsSnap = await db.collection('notifications_contacts').where('systemUserId', '==', oldDocId).get();
    contactsSnap.docs.forEach(docSnap => operations.push({ ref: docSnap.ref, data: { systemUserId: authUid }, type: 'update' }));

    operations.push({ ref: oldRef, type: 'delete' });

    await commitOperationsInChunks(db, operations);

    console.log(`[performDeepUserMigration] Migração profunda concluída: ${oldDocId} → ${authUid}`);
    return { success: true, message: `Migração concluída com sucesso.` };
  } catch (error: any) {
    console.error('[performDeepUserMigration] Erro:', error);
    return { success: false, message: error.message || 'Erro ao executar migração.' };
  }
}

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

    if (userSnap.exists) {
      await userRef.update({
        lastLoginAt: FieldValue.serverTimestamp(),
        ...(email ? { email } : {}),
        ...(displayName ? { name: displayName } : {}),
      });
      return { action: 'existing' };
    }

    if (email) {
      const byEmailSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!byEmailSnap.empty) {
        const oldDoc = byEmailSnap.docs[0];
        const oldDocId = oldDoc.id;
        if (oldDocId !== uid) {
          const migrationResult = await performDeepUserMigration(uid, oldDocId, {
            email: email || undefined,
            name: displayName || undefined
          });
          if (!migrationResult.success) throw new Error(migrationResult.message);
          return { action: 'linked', linkedFromDocId: oldDocId };
        }
      }
    }

    const usersCountSnap = await db.collection('users').limit(1).get();
    const isFirstUser = usersCountSnap.empty;
    await userRef.set({
      name: displayName || 'Novo Usuário',
      email: email || '',
      phone: '',
      hierarchy: { role: isFirstUser ? 'admin' : '' },
      integrationStatus: 'nao_alcancado',
      authUid: uid,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });
    return { action: 'created' };
  } catch (error: any) {
    console.error('[resolveUserProfile] Erro:', error);
    throw new Error(error.message || 'Erro ao resolver perfil.');
  }
}

export async function registerOrLinkUser(email: string, password: string, name: string) {
    try {
        const db = getAdminDb();
        const auth = getAdminAuth();
        const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!usersSnapshot.empty) {
            const existingUserDoc = usersSnapshot.docs[0];
            const existingDocId = existingUserDoc.id;
            try {
                await auth.getUserByEmail(email);
                return { success: false, code: 'auth/email-already-in-use' };
            } catch (authError: any) {
                if (authError.code === 'auth/user-not-found') {
                    await auth.createUser({ uid: existingDocId, email, password, displayName: name });
                    return { success: true, linked: true };
                }
                throw authError;
            }
        }
        return { success: true, linked: false };
    } catch (error: any) {
        console.error('registerOrLinkUser error:', error);
        return { success: false, error: error.message };
    }
}

export async function mergeUserProfiles(authUid: string, oldDocId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!authUid || !oldDocId) return { success: false, message: 'IDs obrigatórios.' };
    if (authUid === oldDocId) return { success: false, message: 'IDs iguais.' };
    return await performDeepUserMigration(authUid, oldDocId);
  } catch (error: any) {
    console.error('[mergeUserProfiles] Erro:', error);
    return { success: false, message: error.message || 'Erro ao mesclar perfis.' };
  }
}
