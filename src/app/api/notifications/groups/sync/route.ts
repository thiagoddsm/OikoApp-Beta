import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * POST /api/notifications/groups/sync
 * Syncs Firestore class student roster with WhatsApp group membership
 */
export async function POST(request: Request) {
    try {
        const { classId } = await request.json();
        if (!classId) {
            return NextResponse.json({ success: false, error: 'classId é obrigatório' }, { status: 400 });
        }

        const db = getAdminDb();
        const classSnap = await db.collection('classes').doc(classId).get();
        if (!classSnap.exists) {
            return NextResponse.json({ success: false, error: 'Turma não encontrada' }, { status: 404 });
        }

        const classData = classSnap.data() || {};
        const whatsappGroupId = classData.whatsappGroupId;
        if (!whatsappGroupId) {
            return NextResponse.json({ success: false, warning: 'Turma não possui grupo do WhatsApp vinculado.' });
        }

        // 1. Fetch credentials
        const configSnap = await db.collection('config').doc('notifications').get();
        const configData = configSnap.exists ? configSnap.data() : {};
        const waKey = configData?.evolutionKey || configData?.instanceKey || configData?.whatsappApiKey || null;
        const serverUrl = (configData?.evolutionUrl || configData?.serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
        const instanceName = configData?.evolutionInstance || configData?.instanceName || 'IBM';

        if (!waKey) {
            return NextResponse.json({ success: false, error: 'API Key não configurada.' }, { status: 400 });
        }

        // 2. Fetch group participants from Evolution API
        const detailUrl = `${serverUrl}/group/findGroupInfos/${instanceName}?groupJid=${encodeURIComponent(whatsappGroupId)}`;
        const groupRes = await fetch(detailUrl, {
            method: 'GET',
            headers: { 'accept': '*/*', 'apikey': waKey },
            cache: 'no-store',
        });
        
        if (!groupRes.ok) {
            return NextResponse.json({ success: false, error: `Erro ao obter info do grupo do WhatsApp (${groupRes.status})` }, { status: 400 });
        }

        const groupDataRes = await groupRes.json();
        const groupDetails = groupDataRes.data || groupDataRes;
        const currentGroupParticipants = groupDetails.participants || []; // Array of { id: string, admin: string | boolean }

        // 3. Resolve target phone list from Firestore (Class Students)
        const isCompleted = classData.status === 'completed';
        const classStudentsIds = isCompleted ? [] : (classData.students || []); // If completed, remove all students!

        const studentsPhoneJids: string[] = [];
        const studentIdToJidMap = new Map<string, string>();

        if (classStudentsIds.length > 0) {
            // Chunk ids in sizes of 30 due to Firestore "in" constraint
            const chunks: string[][] = [];
            for (let i = 0; i < classStudentsIds.length; i += 30) {
                chunks.push(classStudentsIds.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                const studentsSnap = await db.collection('users').where('__name__', 'in', chunk).get();
                studentsSnap.docs.forEach(docSnap => {
                    const u = docSnap.data();
                    const uPhone = String(u.phone || u.phoneNumber || '').replace(/\D/g, '');
                    const isLidValid = u.lid && String(u.lid).includes('@lid') && String(u.lid).replace(/\D/g, '').length > 5;
                    
                    if (isLidValid) {
                        studentIdToJidMap.set(docSnap.id, u.lid);
                        studentsPhoneJids.push(u.lid);
                    } else if (uPhone && uPhone.length >= 8) {
                        const formatted = uPhone.startsWith('55') ? uPhone : `55${uPhone}`;
                        const jid = `${formatted}@s.whatsapp.net`;
                        studentIdToJidMap.set(docSnap.id, jid);
                        studentsPhoneJids.push(jid);
                    }
                });
            }
        }

        // 4. Calculate Additions and Removals
        const botJid = groupDetails.owner;
        const currentParticipantJids = currentGroupParticipants.map((p: any) => p.id);

        // Additions: who is in student list but not in group
        const toAdd = studentsPhoneJids.filter(jid => !currentParticipantJids.some((pj: string) => pj.includes(jid.split('@')[0])));

        // Removals: who is in group, not in student list, is not admin, and is not the bot
        const toRemove = currentGroupParticipants
            .filter((p: any) => {
                const pId = p.id;
                const rawId = pId.split('@')[0];
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                const isBot = rawId === '60765784527084' || pId === botJid;
                const isStudent = studentsPhoneJids.some(jid => jid.includes(rawId));
                
                return !isStudent && !isAdmin && !isBot;
            })
            .map((p: any) => p.id);

        let addedCount = 0;
        let removedCount = 0;
        const errors: string[] = [];

        // 5. Execute API Calls
        if (toAdd.length > 0) {
            try {
                const addRes = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${whatsappGroupId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ action: 'add', participants: toAdd }),
                });
                if (!addRes.ok) {
                    const errorMsg = await addRes.text();
                    errors.push(`Falha ao adicionar integrantes: ${errorMsg}`);
                } else {
                    addedCount += toAdd.length;
                }
            } catch (e: any) {
                errors.push(`Erro ao adicionar: ${e.message}`);
            }
        }

        if (toRemove.length > 0) {
            try {
                const removeRes = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${whatsappGroupId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ action: 'remove', participants: toRemove }),
                });
                if (!removeRes.ok) {
                    const errorMsg = await removeRes.text();
                    errors.push(`Falha ao remover integrantes: ${errorMsg}`);
                } else {
                    removedCount += toRemove.length;
                }
            } catch (e: any) {
                errors.push(`Erro ao remover: ${e.message}`);
            }
        }

        return NextResponse.json({
            success: errors.length === 0,
            addedCount,
            removedCount,
            added: toAdd,
            removed: toRemove,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
