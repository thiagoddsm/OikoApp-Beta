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

        await primaryRef.set(safeMergedData, { merge: true });

        // 2. Transferir histórico de Turmas (classes)
        const classesSnapshot = await db.collection('classes').get();
        const classBatch = db.batch();
        let classesUpdated = 0;

        classesSnapshot.docs.forEach(doc => {
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

                    if (recordChanged) attendanceChanged = true;
                    return newRecord;
                });

                if (attendanceChanged) {
                    updates.attendance = newAttendance;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                classBatch.update(doc.ref, updates);
                classesUpdated++;
            }
        });

        if (classesUpdated > 0) {
            await classBatch.commit();
        }

        // 3. Transferir histórico de Células (cells)
        const cellsSnapshot = await db.collection('cells').get();
        const cellBatch = db.batch();
        let cellsUpdated = 0;

        cellsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            let needsUpdate = false;
            const updates: any = {};

            if (secondaryIds.includes(data.leaderId)) {
                updates.leaderId = primaryId;
                needsUpdate = true;
            }
            if (secondaryIds.includes(data.hostId)) {
                updates.hostId = primaryId;
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

            if (needsUpdate) {
                cellBatch.update(doc.ref, updates);
                cellsUpdated++;
            }
        });

        if (cellsUpdated > 0) {
            await cellBatch.commit();
        }

        // 4. Excluir contas secundárias
        const deleteBatch = db.batch();
        secondaryIds.forEach(id => {
            deleteBatch.delete(db.collection('users').doc(id));
        });
        await deleteBatch.commit();

        revalidatePath('/dashboard/people');
        return { success: true, message: 'Usuários unificados com sucesso.' };
    } catch (error: any) {
        console.error('Erro no deep merge:', error);
        return { success: false, message: error.message || 'Falha ao unificar usuários.' };
    }
}
