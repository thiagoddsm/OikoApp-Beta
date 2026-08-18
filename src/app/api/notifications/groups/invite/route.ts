import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * POST /api/notifications/groups/invite
 * Envia o link oficial de convite do grupo do WhatsApp no privado dos alunos da turma.
 */
export async function POST(request: Request) {
    try {
        const { classId, studentIds, customMessage } = await request.json();
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
            return NextResponse.json({ success: false, error: 'Turma não possui grupo do WhatsApp vinculado.' }, { status: 400 });
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

        // 2. Fetch Course Data
        let courseData: any = {};
        if (classData.courseId) {
            const courseSnap = await db.collection('courses').doc(classData.courseId).get().catch(() => null);
            if (courseSnap && courseSnap.exists) {
                courseData = courseSnap.data() || {};
            }
        }

        // 3. Obter o Link de Convite do Grupo
        let inviteCode = '';
        let inviteUrl = '';
        try {
            const inviteRes = await fetch(`${serverUrl}/group/inviteCode/${instanceName}?groupJid=${encodeURIComponent(whatsappGroupId)}`, {
                method: 'GET',
                headers: { 'accept': '*/*', 'apikey': waKey },
                cache: 'no-store',
            });
            if (inviteRes.ok) {
                const inviteData = await inviteRes.json().catch(() => ({}));
                const code = inviteData.code || inviteData.inviteCode || inviteData.data?.code || inviteData.data?.inviteCode;
                if (code) {
                    inviteCode = code;
                    inviteUrl = `https://chat.whatsapp.com/${code}`;
                }
            }
        } catch (e: any) {
            console.warn('Erro ao obter link de convite:', e?.message);
        }

        if (!inviteUrl) {
            return NextResponse.json({ 
                success: false, 
                error: 'Não foi possível gerar o link de convite do grupo. Verifique se a instância do WhatsApp está conectada.' 
            }, { status: 400 });
        }

        // 4. Determinar Alunos Alvos
        const targetStudentIds: string[] = Array.isArray(studentIds) && studentIds.length > 0
            ? studentIds
            : (classData.students || []);

        if (targetStudentIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum aluno selecionado para envio de convite.' }, { status: 400 });
        }

        // Carregar dados dos usuários
        const chunks: string[][] = [];
        for (let i = 0; i < targetStudentIds.length; i += 30) {
            chunks.push(targetStudentIds.slice(i, i + 30));
        }

        const studentsList: { id: string; name: string; phone: string; lid?: string }[] = [];
        for (const chunk of chunks) {
            const snap = await db.collection('users').where('__name__', 'in', chunk).get();
            snap.docs.forEach(d => {
                const u = d.data();
                const rawPhone = String(u.phone || u.phoneNumber || '').replace(/\D/g, '');
                if (rawPhone && rawPhone.length >= 8) {
                    const formatted = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
                    studentsList.push({
                        id: d.id,
                        name: u.name || 'Aluno(a)',
                        phone: formatted,
                        lid: u.lid
                    });
                }
            });
        }

        if (studentsList.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum dos alunos possui número de telefone válido cadastrado.' }, { status: 400 });
        }

        // 5. Enviar Mensagens Individuais com Delays Seguros
        let sentCount = 0;
        let failedCount = 0;
        const results: { studentName: string; phone: string; success: boolean; error?: string }[] = [];

        const courseName = courseData.name || 'seu Curso';
        const className = classData.name || 'sua Turma';

        for (let i = 0; i < studentsList.length; i++) {
            const student = studentsList[i];
            const firstName = student.name.split(' ')[0];

            if (i > 0) {
                // Pausa humanizada de 3 a 6 segundos entre mensagens privadas
                await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000));
            }

            const defaultMessage = `Olá, *${firstName}*! Tudo bem?\n\nAs aulas do curso *${courseName}* (${className}) estão programadas!\n\nEntre no grupo oficial da turma no WhatsApp pelo link abaixo para acompanhar os avisos, materiais de estudo e cronograma:\n\n👉 ${inviteUrl}\n\nSeja muito bem-vindo(a)! 🎓✨`;

            const finalMessage = customMessage
                ? customMessage
                    .replace(/\{nome\}/gi, firstName)
                    .replace(/\{curso\}/gi, courseName)
                    .replace(/\{turma\}/gi, className)
                    .replace(/\{link\}/gi, inviteUrl)
                : defaultMessage;

            try {
                const sendRes = await fetch(`${serverUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({
                        number: student.phone,
                        text: finalMessage,
                        linkPreview: true
                    }),
                });

                if (sendRes.ok) {
                    sentCount++;
                    results.push({ studentName: student.name, phone: student.phone, success: true });
                } else {
                    const errData = await sendRes.json().catch(() => ({}));
                    failedCount++;
                    results.push({ 
                        studentName: student.name, 
                        phone: student.phone, 
                        success: false, 
                        error: errData.message || `Erro ${sendRes.status}` 
                    });
                }
            } catch (sendErr: any) {
                failedCount++;
                results.push({ 
                    studentName: student.name, 
                    phone: student.phone, 
                    success: false, 
                    error: sendErr.message 
                });
            }
        }

        return NextResponse.json({
            success: sentCount > 0,
            sentCount,
            failedCount,
            total: studentsList.length,
            inviteUrl,
            results
        });

    } catch (e: any) {
        console.error('[API Group Invite Error]:', e);
        return NextResponse.json({ success: false, error: e.message || 'Erro interno ao disparar convites.' }, { status: 500 });
    }
}
