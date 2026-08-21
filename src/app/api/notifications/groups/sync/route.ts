import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * POST /api/notifications/groups/sync
 * Syncs Firestore class student roster with WhatsApp group membership
 */
export async function POST(request: Request) {
    try {
        const { classId, students } = await request.json();
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

        // 3. Resolve target phone list from Firestore (Class Students, Teachers and Support Staff)
        let courseData: any = {};
        if (classData.courseId) {
            const courseSnap = await db.collection('courses').doc(classData.courseId).get().catch(() => null);
            if (courseSnap && courseSnap.exists) {
                courseData = courseSnap.data() || {};
            }
        }

        const isCompleted = classData.status === 'completed';
        const classStudentsIds: string[] = isCompleted ? [] : (students || classData.students || []);

        // Coleta Professores da Turma e do Curso
        const teacherIdsSet = new Set<string>();
        if (classData.teacherId) teacherIdsSet.add(classData.teacherId);
        if (Array.isArray(classData.teacherIds)) classData.teacherIds.forEach((id: string) => teacherIdsSet.add(id));
        if (Array.isArray(courseData.teacherIds)) courseData.teacherIds.forEach((id: string) => teacherIdsSet.add(id));
        if (classData.scheduleOverrides) {
            Object.values(classData.scheduleOverrides).forEach((ov: any) => {
                if (ov?.teacherId) teacherIdsSet.add(ov.teacherId);
            });
        }

        // Coleta Equipe de Apoio / Secretários da Turma e do Curso
        const supportIdsSet = new Set<string>();
        const rawClassSupport = classData.supportTeamIds || classData.supportTeam || [];
        const rawCourseSupport = courseData.supportTeamIds || courseData.supportTeam || [];
        if (Array.isArray(rawClassSupport)) rawClassSupport.forEach((id: string) => supportIdsSet.add(id));
        if (Array.isArray(rawCourseSupport)) rawCourseSupport.forEach((id: string) => supportIdsSet.add(id));

        // Todos os IDs autorizados a estarem no grupo
        const allTargetUserIds = Array.from(new Set([
            ...classStudentsIds,
            ...Array.from(teacherIdsSet),
            ...Array.from(supportIdsSet)
        ]));

        const targetPhoneJids: string[] = [];
        const authorizedIdentities = new Set<string>(); // Set of all possible identifiers for students, teachers and support (LID, JID, phone)
        const studentPhoneJids: string[] = [];

        if (allTargetUserIds.length > 0) {
            // Chunk ids in sizes of 30 due to Firestore "in" constraint
            const chunks: string[][] = [];
            for (let i = 0; i < allTargetUserIds.length; i += 30) {
                chunks.push(allTargetUserIds.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                const usersSnap = await db.collection('users').where('__name__', 'in', chunk).get();
                usersSnap.docs.forEach(docSnap => {
                    const u = docSnap.data();
                    const uPhone = String(u.phone || u.phoneNumber || '').replace(/\D/g, '');
                    
                    if (u.lid) {
                        const lidClean = String(u.lid).split('@')[0];
                        authorizedIdentities.add(lidClean);
                        authorizedIdentities.add(String(u.lid));
                    }
                    if (u.jid) {
                        const jidClean = String(u.jid).split('@')[0];
                        authorizedIdentities.add(jidClean);
                        authorizedIdentities.add(String(u.jid));
                    }
                    
                    if (uPhone && uPhone.length >= 8) {
                        const formatted = uPhone.startsWith('55') ? uPhone : `55${uPhone}`;
                        targetPhoneJids.push(formatted);
                        authorizedIdentities.add(formatted);

                        if (classStudentsIds.includes(docSnap.id)) {
                            studentPhoneJids.push(formatted);
                        }
                    }
                });
            }
        }

        // 4. Calculate Additions and Removals
        const botJid = groupDetails.owner;

        // Additions: quem está na lista autorizada mas ainda não está no grupo
        const toAdd = targetPhoneJids.filter(jid => {
            const raw = jid.split('@')[0];
            return !currentGroupParticipants.some((p: any) => p.id.includes(raw));
        });

        // Removals: quem está no grupo, mas NÃO é aluno/professor/apoio, NÃO é admin e NÃO é o bot
        const toRemove = currentGroupParticipants
            .filter((p: any) => {
                const pId = p.id;
                const rawId = pId.split('@')[0];
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                const isBot = rawId === '60765784527084' || pId === botJid;
                
                const waPhone = p.id?.includes('@s.whatsapp.net') 
                    ? rawId 
                    : (p.phoneNumber || '').replace(/\D/g, '');

                const isAuthorized = authorizedIdentities.has(rawId) || 
                                     authorizedIdentities.has(pId) || 
                                     (waPhone && targetPhoneJids.some(phone => phone.includes(waPhone) || waPhone.includes(phone)));
                
                return !isAuthorized && !isAdmin && !isBot;
            })
            .map((p: any) => p.id);

        // Active sync tracker to prevent parallel sync runs on the same group
        // Removals executed first (immediate, safe)
        let removedCount = 0;
        const errors: string[] = [];

        if (toRemove.length > 0) {
            try {
                for (let i = 0; i < toRemove.length; i++) {
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2500));
                    }
                    try {
                        const removeRes = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${whatsappGroupId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                            body: JSON.stringify({ action: 'remove', participants: [toRemove[i]] }),
                        });
                        if (removeRes.ok) {
                            removedCount++;
                        }
                    } catch (itemErr: any) {
                        console.warn('[Group Sync] Erro ao remover participante do grupo:', itemErr?.message);
                    }
                }
            } catch (e: any) {
                errors.push(`Erro ao remover: ${e.message}`);
            }
        }

        // Additions: Executa em background adicionando 1 PESSOA A CADA MINUTO (45s - 65s) para máxima proteção anti-ban
        if (toAdd.length > 0) {
            console.log(`[Group Sync] Starting background queue for ${toAdd.length} participants (1 per ~60s)...`);

            (async () => {
                for (let i = 0; i < toAdd.length; i++) {
                    const participant = toAdd[i];
                    try {
                        console.log(`[Group Sync Background] (${i + 1}/${toAdd.length}) Adding ${participant} to ${whatsappGroupId}...`);
                        const addRes = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${whatsappGroupId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                            body: JSON.stringify({ action: 'add', participants: [participant] }),
                        });
                        const addData = await addRes.json().catch(() => ({}));
                        if (addRes.ok) {
                            console.log(`[Group Sync Background] Successfully added ${participant}`);
                        } else {
                            console.warn(`[Group Sync Background] Could not add ${participant}:`, addData?.message || addData?.error || addRes.status);
                        }
                    } catch (err: any) {
                        console.warn(`[Group Sync Background] Exception adding ${participant}:`, err?.message);
                    }

                    // Pausa de 45 a 60 segundos antes de tentar o próximo (sem pressa)
                    if (i < toAdd.length - 1) {
                        const delaySec = 45 + Math.floor(Math.random() * 20); // 45 a 65 segundos
                        console.log(`[Group Sync Background] Pausing ${delaySec}s before next participant...`);
                        await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
                    }
                }
                console.log(`[Group Sync Background] Completed background addition queue for group ${whatsappGroupId}`);
            })().catch(bgErr => {
                console.error('[Group Sync Background Queue Error]:', bgErr);
            });
        }

        return NextResponse.json({
            success: true,
            inBackground: toAdd.length > 0,
            toAddCount: toAdd.length,
            removedCount,
            added: toAdd,
            removed: toRemove,
            teachersProtected: teacherIdsSet.size,
            supportProtected: supportIdsSet.size,
            message: toAdd.length > 0 
                ? `Sincronização em segundo plano: ${toAdd.length} participante(s) estão sendo adicionados de forma espaçada (1 por minuto).`
                : 'Grupo 100% sincronizado com sucesso.'
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
