import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const db = getAdminDb();
    const body = await request.json();
    const { 
        channel, 
        audience, 
        message, 
        userIds, 
        targetNumber, 
        serverUrl: bodyServerUrl,
        instanceKey: bodyInstanceKey,
        ...rest
    } = body;

    if (channel !== 'whatsapp') {
        return NextResponse.json({ error: "Canal de notificação inválido." }, { status: 400 });
    }
    
    // 1. Buscar a chave (prioridade para o que veio no body)
    let apiKey = bodyInstanceKey;
    let serverUrl = bodyServerUrl;

    if (!apiKey || !serverUrl) {
        try {
            const configSnap = await db.collection('config').doc('notifications').get();
            if (configSnap.exists) {
                const configData = configSnap.data();
                apiKey = apiKey || configData?.instanceKey || configData?.whatsappApiKey;
                serverUrl = serverUrl || configData?.serverUrl || 'https://us.api-wa.me';
            }
        } catch (e: any) {
            // Se falhar e não tivermos chaves no body, aí sim retornamos erro
            if (!apiKey) {
                return NextResponse.json({ error: `Erro de permissão ao ler configurações e chaves não fornecidas: ${e.message}` }, { status: 403 });
            }
        }
    }

    if (!apiKey) {
        return NextResponse.json({ error: "Gateway de WhatsApp não configurado. Token da API ausente." }, { status: 400 });
    }

    const baseUrl = serverUrl.replace(/\/$/, '');

    // 2. Montar a lista de destinatários
    const targetUsers: any[] = [];
    const targetGroups: string[] = []; // IDs de grupos do WhatsApp

    if (targetNumber || audience === 'individual') {
        const phone = (targetNumber || body.individualPhone || '').replace(/\D/g, '');
        if (phone) {
            targetUsers.push({ id: 'custom', name: 'Destinatário Teste', phone });
        }
    } else if (audience === 'specific_groups' && body.groupIds && body.groupIds.length > 0) {
        // Envio direto para grupos do WhatsApp (ID do grupo, ex: 12345@g.us)
        body.groupIds.forEach((groupId: string) => targetGroups.push(groupId));
    } else if (body.targets && Array.isArray(body.targets)) {
        // NOVO: Alvos enviados diretamente pelo frontend (evita consulta ao Firestore se houver erro de credenciais)
        body.targets.forEach((t: any) => {
            if (t.phone) targetUsers.push({ id: t.id || 'direct', name: t.name || 'Membro', phone: t.phone });
        });
    } else if (audience === 'specific_members' && userIds && userIds.length > 0) {
        // Buscar usuários específicos por ID (Fallback se o admin estiver funcionando)
        try {
            const userPromises = userIds.map((id: string) => db.collection('users').doc(id).get());
            const userSnaps = await Promise.all(userPromises);
            
            userSnaps.forEach(snap => {
                if (snap.exists) {
                    const data = snap.data();
                    if (data?.phone) {
                        targetUsers.push({ id: snap.id, name: data.name || 'Membro', phone: data.phone });
                    }
                }
            });
        } catch (e: any) {
            return NextResponse.json({ 
                error: `Erro ao acessar Firestore: ${e.message}. Tente selecionar os membros novamente ou verifique as credenciais do servidor.` 
            }, { status: 500 });
        }
    } else if (audience === 'all_members') {
         try {
            const usersSnap = await db.collection('users').get();
            usersSnap.forEach(d => {
                const data = d.data();
                if (data.phone) targetUsers.push({ id: d.id, name: data.name || 'Membro', phone: data.phone });
            });
         } catch (e: any) {
            return NextResponse.json({ error: `Erro ao buscar todos os membros: ${e.message}` }, { status: 500 });
         }
    }

    if (targetUsers.length === 0 && targetGroups.length === 0) {
        return NextResponse.json({ success: false, message: "Nenhum destinatário válido encontrado." });
    }

    // 3. Helper: delay aleatório entre min e max milissegundos
    const delay = (minMs: number, maxMs: number) => 
        new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));

    // 4. Registrar broadcast no Firestore ANTES de começar a enviar
    const summary = message || (rest.surveyName ? `[Enquete] ${rest.surveyName}` : rest.type === 'media' ? '[Mídia]' : '[Mensagem]');
    const totalRecipients = targetUsers.length + targetGroups.length;

    let broadcastId: string | null = null;
    try {
        const historyRef = await db.collection("notifications_history").add({
            sentAt: Timestamp.now(),
            channel: 'whatsapp',
            message: summary,
            surveyName: rest.surveyName || null,
            recipientCount: totalRecipients,
            successCount: 0,
            errorCount: 0,
            status: 'sending', // Novo status: em andamento
            progress: 0,
            type: rest.type || 'text',
            targetLabel: rest.audience || audience || 'custom',
        });
        broadcastId = historyRef.id;
    } catch (e) {
        console.warn("Falha ao registrar histórico de notificação:", e);
    }

    // 5. RATE-LIMITED BACKGROUND PROCESSING
    // Retorna imediatamente para o navegador. Processamento continua no servidor.
    const processInBackground = async () => {
        const { getWhatsAppClient, formatWhatsAppNumber } = await import('@/lib/whatsapp');
        const whatsapp = await getWhatsAppClient({ server: serverUrl, key: apiKey });

        let sentCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        const sentMessages: { messageId: string, recipient: string, name?: string }[] = [];
        let messageIndex = 0;

        // Helper: preparar body da mensagem
        const buildMessageBody = (to: string, personalizedBody: string) => {
            let messageBody: any = { to };

            if (rest.type === 'button') {
                messageBody.text = personalizedBody || ' ';
                messageBody.title = rest.headerTitle || undefined;
                messageBody.footer = rest.footer || '';
                messageBody.buttons = rest.buttons || [];
            } else if (rest.type === 'survey') {
                messageBody.name = rest.surveyName || 'Enquete';
                messageBody.options = rest.options || [];
            } else if (rest.type === 'list') {
                messageBody.text = personalizedBody || 'Escolha uma opção';
                messageBody.buttonText = rest.buttonText || 'Menu';
                messageBody.title = rest.headerTitle || 'Opções';
                messageBody.description = rest.description || '';
                messageBody.footer = rest.footer || '';
                messageBody.sections = rest.sections || [];
            } else if (rest.type === 'media' || rest.type === 'image') {
                messageBody.caption = personalizedBody || ' ';
                messageBody.url = rest.mediaUrl;
            } else {
                messageBody.text = personalizedBody;
            }
            return messageBody;
        };

        // Helper: enviar uma mensagem e registrar resultado
        const sendOne = async (to: string, name: string, personalizedBody: string) => {
            const messageBody = buildMessageBody(to, personalizedBody);
            try {
                const response = await whatsapp.sendMessage({
                    type: rest.type || 'text',
                    body: messageBody
                });

                const isSuccess = response.status === 'success' || response.status === 200 || response.key || response.id || response.messageId || response.data?.id;
                if (isSuccess) {
                    sentCount++;
                    const mId = response.messageId || response.id || response.key?.id || response.data?.id || (response.data && response.data[0]?.id);
                    if (mId) sentMessages.push({ messageId: mId, recipient: to, name });
                } else {
                    errorCount++;
                    errors.push(`Falha para ${name}: ${JSON.stringify(response)}`);
                }
            } catch (e: any) {
                errorCount++;
                errors.push(`Erro para ${name}: ${e.message}`);
            }
        };

        // Helper: atualizar progresso no Firestore
        const updateProgress = async () => {
            if (!broadcastId) return;
            try {
                await db.collection('notifications_history').doc(broadcastId).update({
                    successCount: sentCount,
                    errorCount: errorCount,
                    progress: Math.round(((sentCount + errorCount) / totalRecipients) * 100),
                    status: 'sending',
                });
            } catch {}
        };

        // ===== ENVIAR PARA USUÁRIOS COM RATE LIMITING =====
        for (const user of targetUsers) {
            messageIndex++;
            const personalizedBody = (message || '').replace('{{nome}}', user.name);
            const formattedPhone = formatWhatsAppNumber(user.phone);

            await sendOne(formattedPhone, user.name, personalizedBody);

            // Rate limiting conservador:
            // - Delay de 3-5 segundos entre cada mensagem
            // - Pausa de 30 segundos a cada 10 mensagens
            if (messageIndex % 10 === 0) {
                await updateProgress();
                console.log(`[Rate Limit] Pausa de 30s após ${messageIndex} mensagens...`);
                await delay(28000, 35000); // 28-35 segundos
            } else {
                await delay(3000, 5000); // 3-5 segundos
            }
        }

        // ===== ENVIAR PARA GRUPOS COM RATE LIMITING =====
        for (const groupId of targetGroups) {
            messageIndex++;
            await sendOne(groupId, `Grupo ${groupId.split('@')[0]}`, message || '');

            if (messageIndex % 10 === 0) {
                await updateProgress();
                console.log(`[Rate Limit] Pausa de 30s após ${messageIndex} mensagens...`);
                await delay(28000, 35000);
            } else {
                await delay(3000, 5000);
            }
        }

        // ===== FINALIZAR: atualizar status final =====
        if (broadcastId) {
            try {
                await db.collection('notifications_history').doc(broadcastId).update({
                    successCount: sentCount,
                    errorCount: errorCount,
                    progress: 100,
                    status: errorCount > 0 ? (sentCount > 0 ? 'partial' : 'failed') : 'success',
                    completedAt: Timestamp.now(),
                });
            } catch (e) {
                console.error("Erro ao atualizar status final:", e);
            }

            // Registrar IDs de mensagens para rastreamento de respostas
            if (sentMessages.length > 0) {
                try {
                    // Firestore batch limit é 500, chunkar se necessário
                    const chunks = [];
                    for (let i = 0; i < sentMessages.length; i += 400) {
                        chunks.push(sentMessages.slice(i, i + 400));
                    }
                    for (const chunk of chunks) {
                        const msgBatch = db.batch();
                        chunk.forEach(m => {
                            const msgRef = db.collection('notifications_sent_messages').doc(m.messageId);
                            msgBatch.set(msgRef, {
                                messageId: m.messageId,
                                broadcastId: broadcastId,
                                recipient: m.recipient,
                                sentAt: Timestamp.now()
                            });
                            if (m.name) {
                                const phone = m.recipient.split('@')[0].split(':')[0].replace(/\D/g, '');
                                if (phone) {
                                    const contactRef = db.collection('notifications_contacts').doc(phone);
                                    msgBatch.set(contactRef, {
                                        phoneNumber: phone,
                                        name: m.name,
                                        updatedAt: Timestamp.now()
                                    }, { merge: true });
                                }
                            }
                        });
                        await msgBatch.commit();
                    }
                } catch (e) {
                    console.error("Erro ao registrar mensagens enviadas:", e);
                }
            }
        }

        console.log(`[Broadcast ${broadcastId}] Concluído: ${sentCount} enviados, ${errorCount} erros`);
    };

    // Disparar processamento em background (fire-and-forget)
    processInBackground().catch(e => {
        console.error('[Background Send] Fatal error:', e);
        if (broadcastId) {
            db.collection('notifications_history').doc(broadcastId).update({
                status: 'failed',
                progress: 100,
                errorMessage: e.message,
                completedAt: Timestamp.now(),
            }).catch(() => {});
        }
    });

    // Retorna IMEDIATAMENTE para o navegador
    return NextResponse.json({ 
        success: true, 
        sentCount: 0, // Será atualizado em background
        totalRecipients,
        broadcastId,
        message: `Disparo iniciado para ${totalRecipients} destinatário(s). Acompanhe o progresso na aba Histórico.`,
        background: true // Sinaliza para o frontend que é processamento assíncrono
    });

  } catch (error: any) {
    console.error("API Route Critical Error:", error.message);
    return NextResponse.json({ error: `Erro interno no servidor: ${error.message}` }, { status: 500 });
  }
}
