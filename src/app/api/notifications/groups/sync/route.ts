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

        let addedCount = 0;
        let removedCount = 0;
        const privacyBlocked: string[] = [];
        const errors: string[] = [];

        // Helper function for chunking array
        const chunkArray = <T>(arr: T[], size: number): T[][] => {
            const chunks: T[][] = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        // 5. Execute API Calls with anti-ban chunking and humanized delays
        if (toAdd.length > 0) {
            try {
                // Chunk de no máximo 2 adições por vez para máxima segurança anti-ban
                const addChunks = chunkArray(toAdd, 2);
                for (let i = 0; i < addChunks.length; i++) {
                    if (i > 0) {
                        // Pausa humanizada de 4 a 7 segundos entre lotes
                        await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 3000));
                    }
                    try {
                        const addRes = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${whatsappGroupId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                            body: JSON.stringify({ action: 'add', participants: addChunks[i] }),
                        });
                        
                        const addData = await addRes.json().catch(() => ({}));

                        if (!addRes.ok) {
                            const errorMsg = addData?.message || (Array.isArray(addData?.error) ? addData.error.join(', ') : addData?.error) || `Erro ${addRes.status}`;
                            // Se for erro de restrição de privacidade do usuário, não derruba o fluxo
                            if (addRes.status === 403 || String(errorMsg).includes('privacy') || String(errorMsg).includes('not-authorized')) {
                                privacyBlocked.push(...addChunks[i]);
                            } else {
                                errors.push(`Falha ao adicionar: ${errorMsg}`);
                            }
                        } else {
                            addedCount += addChunks[i].length;
                        }
                    } catch (itemErr: any) {
                        console.warn('Erro ao processar lote de adição no grupo:', itemErr?.message);
                        errors.push(`Erro de conexão ao adicionar: ${itemErr?.message}`);
                    }
                }
            } catch (e: any) {
                errors.push(`Erro ao adicionar: ${e.message}`);
            }
        }

        // Delay de 4 a 6 segundos entre adições e remoções
        if (toAdd.length > 0 && toRemove.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 2000));
        }

        if (toRemove.length > 0) {
            try {
                // Chunk de no máximo 2 remoções por vez
                const removeChunks = chunkArray(toRemove, 2);
                for (let i = 0; i < removeChunks.length; i++) {
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 2000));
                    }
                    try {
                        const removeRes = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${whatsappGroupId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                            body: JSON.stringify({ action: 'remove', participants: removeChunks[i] }),
                        });
                        if (!removeRes.ok) {
                            const errorMsg = await removeRes.text();
                            errors.push(`Falha ao remover integrante(s): ${errorMsg}`);
                        } else {
                            removedCount += removeChunks[i].length;
                        }
                    } catch (itemErr: any) {
                        console.warn('Erro ao processar lote de remoção no grupo:', itemErr?.message);
                    }
                }
            } catch (e: any) {
                errors.push(`Erro ao remover: ${e.message}`);
            }
        }

        return NextResponse.json({
            success: errors.length === 0,
            addedCount,
            removedCount,
            privacyBlockedCount: privacyBlocked.length,
            privacyBlocked,
            added: toAdd,
            removed: toRemove,
            teachersProtected: teacherIdsSet.size,
            supportProtected: supportIdsSet.size,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
