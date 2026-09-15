'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const db = getAdminDb();

const convertToAdminTypes = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(convertToAdminTypes);
    }
    if (typeof data === 'object' && data !== null) {
        if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
            return new Timestamp(data.seconds, data.nanoseconds);
        }
        const newObj: { [key: string]: any } = {};
        for (const key of Object.keys(data)) {
            newObj[key] = convertToAdminTypes(data[key]);
        }
        return newObj;
    }
    return data;
};

export async function mergeUsersDeepAction(primaryId: string, secondaryIds: string[], mergedData: any) {
    if (!primaryId || !secondaryIds || secondaryIds.length === 0) {
        throw new Error('IDs inválidos para unificação.');
    }

    try {
        // 1. Atualizar o usuário principal com os dados mesclados
        const primaryRef = db.collection('users').doc(primaryId);
        
        // Convert plain JSON objects back to Firestore Timestamps
        const parsedData = convertToAdminTypes(mergedData);

        // Remove undefined values to avoid Firestore errors
        const safeMergedData = Object.entries(parsedData).reduce((acc, [k, v]) => {
            if (v !== undefined) acc[k] = v;
            return acc;
        }, {} as any);

        safeMergedData.unificadoEm = FieldValue.serverTimestamp();
        safeMergedData.idsMesclados = FieldValue.arrayUnion(...secondaryIds);

        await primaryRef.set(safeMergedData, { merge: true });

        // 2. Transferir histórico de Turmas (classes)
        const classesSnapshot = await db.collection('classes').get();
        for (const doc of classesSnapshot.docs) {
            const data = doc.data();
            let needsUpdate = false;
            const updates: any = {};

            // Atualizar professor
            if (secondaryIds.includes(data.teacherId)) {
                updates.teacherId = primaryId;
                needsUpdate = true;
            }

            // Atualizar alunos matriculados
            if (data.students && Array.isArray(data.students)) {
                const hasSecondary = data.students.some((id: string) => secondaryIds.includes(id));
                if (hasSecondary) {
                    const newStudents = new Set(data.students.filter((id: string) => !secondaryIds.includes(id)));
                    newStudents.add(primaryId);
                    updates.students = Array.from(newStudents);
                    needsUpdate = true;
                }
            }

            // Atualizar chamadas (attendance)
            if (data.attendance && Array.isArray(data.attendance)) {
                let attendanceChanged = false;
                const newAttendance = data.attendance.map((record: any) => {
                    let recordChanged = false;
                    const newRecord = { ...record };

                    if (record.presentStudentIds && Array.isArray(record.presentStudentIds)) {
                        if (record.presentStudentIds.some((id: string) => secondaryIds.includes(id))) {
                            const newPresent = new Set(record.presentStudentIds.filter((id: string) => !secondaryIds.includes(id)));
                            newPresent.add(primaryId);
                            newRecord.presentStudentIds = Array.from(newPresent);
                            recordChanged = true;
                        }
                    }

                    if (record.onlineStudentIds && Array.isArray(record.onlineStudentIds)) {
                        if (record.onlineStudentIds.some((id: string) => secondaryIds.includes(id))) {
                            const newOnline = new Set(record.onlineStudentIds.filter((id: string) => !secondaryIds.includes(id)));
                            newOnline.add(primaryId);
                            newRecord.onlineStudentIds = Array.from(newOnline);
                            recordChanged = true;
                        }
                    }

                    if (record.justifiedStudentIds && Array.isArray(record.justifiedStudentIds)) {
                        if (record.justifiedStudentIds.some((id: string) => secondaryIds.includes(id))) {
                            const newJustified = new Set(record.justifiedStudentIds.filter((id: string) => !secondaryIds.includes(id)));
                            newJustified.add(primaryId);
                            newRecord.justifiedStudentIds = Array.from(newJustified);
                            recordChanged = true;
                        }
                    }

                    if (record.repositions && Array.isArray(record.repositions)) {
                        let reposChanged = false;
                        newRecord.repositions = record.repositions.map((repo: any) => {
                            if (secondaryIds.includes(repo.studentId)) {
                                reposChanged = true;
                                return { ...repo, studentId: primaryId, studentName: safeMergedData.name || repo.studentName };
                            }
                            return repo;
                        });
                        if (reposChanged) recordChanged = true;
                    }

                    if (recordChanged) attendanceChanged = true;
                    return newRecord;
                });

                if (attendanceChanged) {
                    updates.attendance = newAttendance;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await doc.ref.update(updates);
            }
        }

        // 3. Transferir histórico de Células (cells)
        const cellsSnapshot = await db.collection('cells').get();
        for (const doc of cellsSnapshot.docs) {
            const data = doc.data();
            let needsUpdate = false;
            const updates: any = {};

            if (secondaryIds.includes(data.leaderId) || secondaryIds.includes(data.liderId)) {
                if (data.leaderId) updates.leaderId = primaryId;
                if (data.liderId) updates.liderId = primaryId;
                needsUpdate = true;
            }
            if (secondaryIds.includes(data.liderCasalId)) {
                updates.liderCasalId = primaryId;
                needsUpdate = true;
            }
            if (secondaryIds.includes(data.secretariaId)) {
                updates.secretariaId = primaryId;
                needsUpdate = true;
            }
            if (secondaryIds.includes(data.hostId) || secondaryIds.includes(data.anfitriaoId)) {
                if (data.hostId) updates.hostId = primaryId;
                if (data.anfitriaoId) updates.anfitriaoId = primaryId;
                needsUpdate = true;
            }

            if (data.members && Array.isArray(data.members)) {
                const hasSecondary = data.members.some((id: string) => secondaryIds.includes(id));
                if (hasSecondary) {
                    const newMembers = new Set(data.members.filter((id: string) => !secondaryIds.includes(id)));
                    newMembers.add(primaryId);
                    updates.members = Array.from(newMembers);
                    needsUpdate = true;
                }
            }

            if (data.membros && Array.isArray(data.membros)) {
                const hasSecondary = data.membros.some((m: any) => {
                    const mid = typeof m === 'string' ? m : m?.id;
                    return secondaryIds.includes(mid);
                });
                if (hasSecondary) {
                    updates.membros = data.membros.map((m: any) => {
                        const mid = typeof m === 'string' ? m : m?.id;
                        if (secondaryIds.includes(mid)) {
                            return typeof m === 'string' ? primaryId : { ...m, id: primaryId, name: safeMergedData.name || m.name };
                        }
                        return m;
                    });
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await doc.ref.update(updates);
            }
        }

        // 4. Transferir inscrições (enrollment_requests)
        const enrollmentsSnapshot = await db.collection('enrollment_requests').get();
        for (const doc of enrollmentsSnapshot.docs) {
            const data = doc.data();
            let needsUpdate = false;
            const updates: any = {};

            if (secondaryIds.includes(data.userId)) {
                updates.userId = primaryId;
                if (safeMergedData.name) updates.userName = safeMergedData.name;
                needsUpdate = true;
            }
            if (secondaryIds.includes(data.studentId)) {
                updates.studentId = primaryId;
                if (safeMergedData.name) {
                    updates.studentName = safeMergedData.name;
                    updates.userName = safeMergedData.name;
                }
                needsUpdate = true;
            }

            if (needsUpdate) {
                await doc.ref.update(updates);
            }
        }

        // 5. Transferir diários pedagógicos (pedagogical_logs)
        const logsSnapshot = await db.collection('pedagogical_logs').get();
        for (const doc of logsSnapshot.docs) {
            const data = doc.data();
            if (secondaryIds.includes(data.studentId)) {
                await doc.ref.update({
                    studentId: primaryId,
                    ...(safeMergedData.name ? { studentName: safeMergedData.name } : {})
                });
            }
        }

        // 6. Transferir presenças históricas de célula (presencas_historico)
        for (const secId of secondaryIds) {
            const presSnap = await db.collection('presencas_historico').where('membroId', '==', secId).get();
            for (const pDoc of presSnap.docs) {
                await pDoc.ref.update({
                    membroId: primaryId,
                    ...(safeMergedData.name ? { membroNome: safeMergedData.name } : {})
                });
            }
        }

        // 7. Excluir contas secundárias
        for (const id of secondaryIds) {
            await db.collection('users').doc(id).delete();
        }

        revalidatePath('/dashboard/people');
        return { success: true, message: 'Usuários unificados com sucesso.' };
    } catch (error: any) {
        console.error('Erro no deep merge:', error);
        return { success: false, message: error.message || 'Falha ao unificar usuários.' };
    }
}
