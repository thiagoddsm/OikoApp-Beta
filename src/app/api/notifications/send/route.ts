import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { context, errorResponse } = await requireAuth(request, ['admin', 'communication']);
    if (errorResponse) return errorResponse;

    const db = getAdminDb();
    const body = await request.json();
    const { 
        channel, 
        audience, 
        message, 
        userIds, 
        targetNumber, 
        ...rest
    } = body;

    if (channel !== 'whatsapp') {
        return NextResponse.json({ error: "Canal de notificação inválido." }, { status: 400 });
    }
    
    // 1. Buscar as configurações protegidas no servidor
    let apiKey = process.env.EVOLUTION_API_KEY;
    let serverUrl = process.env.EVOLUTION_API_URL;
    let configData: any = null;

    try {
        const configSnap = await db.collection('config').doc('notifications').get();
        if (configSnap.exists) {
            configData = configSnap.data();
            apiKey = apiKey || configData?.instanceKey || configData?.whatsappApiKey;
            serverUrl = serverUrl || configData?.serverUrl || 'https://us.api-wa.me';
        }
    } catch (e: any) {
        if (!apiKey) {
            return NextResponse.json({ error: 'Erro ao carregar credenciais do gateway de notificação.' }, { status: 403 });
        }
    }

    if (!apiKey) {
        return NextResponse.json({ error: "Gateway de WhatsApp não configurado no servidor." }, { status: 400 });
    }

    const delayMin = configData?.delayMin !== undefined ? Number(configData.delayMin) : 20;
    const delayMax = configData?.delayMax !== undefined ? Number(configData.delayMax) : 45;
    const microPauseFrequency = configData?.microPauseFrequency !== undefined ? Number(configData.microPauseFrequency) : 5;
    const microPauseMin = configData?.microPauseMin !== undefined ? Number(configData.microPauseMin) : 30;
    const microPauseMax = configData?.microPauseMax !== undefined ? Number(configData.microPauseMax) : 50;
    const deepSleepFrequency = configData?.deepSleepFrequency !== undefined ? Number(configData.deepSleepFrequency) : 20;
    const deepSleepMin = configData?.deepSleepMin !== undefined ? Number(configData.deepSleepMin) : 180;
    const deepSleepMax = configData?.deepSleepMax !== undefined ? Number(configData.deepSleepMax) : 300;

    const safeServerUrl = serverUrl || 'https://us.api-wa.me';
    const baseUrl = safeServerUrl.replace(/\/$/, '');

    // Buscar todos os números cadastrados na blacklist
    const blacklistedNumbers = new Set<string>();
    try {
        const blacklistSnap = await db.collection('notifications_blacklist').get();
        blacklistSnap.forEach((doc: any) => {
            const phone = doc.id.replace(/\D/g, '');
            if (phone) {
                blacklistedNumbers.add(phone);
            }
        });
    } catch (e: any) {
        console.warn("Falha ao ler notifications_blacklist:", e.message);
    }

    // 2. Montar a lista de destinatários
    const targetUsers: any[] = [];
    const targetGroups: string[] = []; // IDs de grupos do WhatsApp
    
    let broadcastId: string | null = body.resumeBroadcastId || null;
    let existingBroadcastData: any = null;

    if (broadcastId) {
        try {
            const existingSnap = await db.collection("notifications_history").doc(broadcastId).get();
            if (existingSnap.exists) {
                existingBroadcastData = existingSnap.data();
            }
        } catch (e) {
            console.error("Erro ao buscar histórico para resumeBroadcastId:", e);
        }
    }

    const effectiveAudience = audience || body.audience || existingBroadcastData?.targetLabel || existingBroadcastData?.retryPayload?.audience;
    const effectiveTargets = body.targets || existingBroadcastData?.retryPayload?.targets;
    const effectiveUserIds = userIds || body.userIds || existingBroadcastData?.retryPayload?.userIds;
    const effectiveMessage = message || existingBroadcastData?.message || existingBroadcastData?.retryPayload?.message || '';

    if (targetNumber || effectiveAudience === 'individual') {
        const phone = (targetNumber || body.individualPhone || existingBroadcastData?.retryPayload?.individualPhone || '').replace(/\D/g, '');
        if (phone) {
            targetUsers.push({ id: 'custom', name: 'Destinatário Teste', phone });
        }
    } else if (effectiveAudience === 'specific_groups' && (body.groupIds || existingBroadcastData?.retryPayload?.groupIds)) {
        const gIds = body.groupIds || existingBroadcastData?.retryPayload?.groupIds || [];
        gIds.forEach((groupId: string) => targetGroups.push(groupId));
    } else if (effectiveTargets && Array.isArray(effectiveTargets) && effectiveTargets.length > 0) {
        effectiveTargets.forEach((t: any) => {
            if (t.phone) targetUsers.push({ id: t.id || 'direct', name: t.name || 'Membro', phone: t.phone });
        });
    } else if (effectiveAudience === 'specific_members' && effectiveUserIds && effectiveUserIds.length > 0) {
        try {
            const userPromises = effectiveUserIds.map((id: string) => db.collection('users').doc(id).get());
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
    } else if (effectiveAudience === 'all_members' || effectiveAudience === 'membro' || effectiveAudience === 'custom' || !effectiveAudience) {
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

    const filteredTargetUsers = targetUsers.filter(user => {
        const phoneStr = String(user.phone || '');
        const cleaned = phoneStr.replace(/\D/g, '');
        return cleaned.length > 0 && !blacklistedNumbers.has(cleaned);
    });

    const alreadySentSet = new Set<string>();
    let initialSentCount = 0;

    if (existingBroadcastData) {
        initialSentCount = Number(existingBroadcastData.successCount || 0);
        const sentList = existingBroadcastData.sentTargets || [];
        sentList.forEach((t: any) => {
            if (t.phone) alreadySentSet.add(String(t.phone).replace(/\D/g, ''));
        });

        // Fallback para disparos legados cujo array sentTargets estava vazio:
        // Considera que os primeiros initialSentCount membros da lista ja receberam a mensagem
        if (alreadySentSet.size < initialSentCount && filteredTargetUsers.length >= initialSentCount) {
            for (let i = 0; i < initialSentCount; i++) {
                const phoneClean = String(filteredTargetUsers[i].phone || '').replace(/\D/g, '');
                if (phoneClean) alreadySentSet.add(phoneClean);
            }
        }
    }

    const pendingTargetUsers = broadcastId
        ? filteredTargetUsers.filter(user => {
            const cleaned = String(user.phone || '').replace(/\D/g, '');
            return !alreadySentSet.has(cleaned);
        })
        : filteredTargetUsers;

    if (pendingTargetUsers.length === 0 && targetGroups.length === 0) {
        if (broadcastId) {
            await db.collection("notifications_history").doc(broadcastId).update({
                status: 'success',
                progress: 100,
                completedAt: Timestamp.now()
            }).catch(() => {});
            return NextResponse.json({ success: true, message: "Todos os destinatários deste disparo já receberam a mensagem." });
        }
        return NextResponse.json({ success: false, message: "Nenhum destinatário válido encontrado (ou todos estão descadastrados)." });
    }

    // 3. Helper: delay aleatório entre min e max milissegundos
    const delay = (minMs: number, maxMs: number) => 
        new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));

    // 4. Registrar broadcast no Firestore ANTES de começar a enviar
    const summary = effectiveMessage || (rest.surveyName ? `[Enquete] ${rest.surveyName}` : rest.type === 'media' ? '[Mídia]' : '[Mensagem]');
    const totalRecipients = existingBroadcastData?.recipientCount || (filteredTargetUsers.length + targetGroups.length);

    const fullRetryPayload = {
        channel: 'whatsapp',
        audience: effectiveAudience || 'custom',
        message: effectiveMessage,
        userIds: userIds || body.userIds || existingBroadcastData?.retryPayload?.userIds || null,
        targets: filteredTargetUsers.length > 0 ? filteredTargetUsers : null,
        groupIds: targetGroups.length > 0 ? targetGroups : null,
        ...rest
    };

    if (!broadcastId) {
        try {
            const historyRef = await db.collection("notifications_history").add({
                sentAt: Timestamp.now(),
                channel: 'whatsapp',
                message: summary,
                surveyName: rest.surveyName || null,
                recipientCount: totalRecipients,
                successCount: 0,
                errorCount: 0,
                status: 'sending',
                progress: 0,
                type: rest.type || 'text',
                targetLabel: effectiveAudience || 'custom',
                retryPayload: fullRetryPayload,
                sentTargets: [],
            });
            broadcastId = historyRef.id;
        } catch (e) {
            console.warn("Falha ao registrar histórico de notificação:", e);
        }
    } else {
        try {
            await db.collection("notifications_history").doc(broadcastId).update({
                status: 'sending',
                updatedAt: Timestamp.now(),
                retryPayload: fullRetryPayload
            });
        } catch (e) {
            console.warn("Falha ao atualizar histórico de notificação:", e);
        }
    }

    // 5. RATE-LIMITED BACKGROUND PROCESSING
    const processInBackground = async () => {
        const { getWhatsAppClient, formatWhatsAppNumber } = await import('@/lib/whatsapp');
        const whatsapp = await getWhatsAppClient({ server: safeServerUrl, key: apiKey });

        let sentCount = initialSentCount;
        let errorCount = Number(existingBroadcastData?.errorCount || 0);
        const errors: string[] = [...(existingBroadcastData?.errors || [])];
        const failedTargets: any[] = [...(existingBroadcastData?.failedTargets || [])];
        const sentTargets: any[] = [...(existingBroadcastData?.sentTargets || [])];
        const sentMessages: { messageId: string, recipient: string, name?: string }[] = [];
        let messageIndex = initialSentCount;

        // Helper: processar texto com Spintax
        const parseSpintax = (text: string): string => {
            const spintaxRegex = /\{([^{}]+)\}/g;
            let result = text;
            while (spintaxRegex.test(result)) {
                result = result.replace(spintaxRegex, (match, options) => {
                    const choices = options.split('|');
                    return choices[Math.floor(Math.random() * choices.length)];
                });
            }
            return result;
        };

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
            } else if (rest.type === 'contact') {
                messageBody.name = rest.contactName || 'Contato';
                messageBody.vcardPhone = rest.contactPhone || '';
            } else {
                messageBody.text = personalizedBody;
            }
            return messageBody;
        };

        // Helper: enviar uma mensagem e registrar resultado
        const sendOne = async (to: string, name: string, personalizedBody: string, originalTarget: any) => {
            try {
                await whatsapp.sendMessage({
                    type: 'text' as any,
                    body: { to, status: 'composing' } as any
                });
                await delay(2000, 5000);
            } catch (e) {}

            const messageBody = buildMessageBody(to, personalizedBody);
            try {
                const response = await whatsapp.sendMessage({
                    type: rest.type || 'text',
                    body: messageBody
                });

                const isSuccess = response.status === 'success' || response.status === 200 || response.key || response.id || response.messageId || response.data?.id;
                if (isSuccess) {
                    sentCount++;
                    sentTargets.push({ id: originalTarget.id || 'direct', name, phone: originalTarget.phone || to });
                    const mId = response.messageId || response.id || response.key?.id || response.data?.id || (response.data && response.data[0]?.id);
                    if (mId) sentMessages.push({ messageId: mId, recipient: to, name });
                } else {
                    errorCount++;
                    errors.push(`Falha para ${name}: ${JSON.stringify(response)}`);
                    failedTargets.push(originalTarget);
                }
            } catch (e: any) {
                errorCount++;
                errors.push(`Erro para ${name}: ${e.message}`);
                failedTargets.push(originalTarget);
            }
        };

        // Helper: atualizar progresso no Firestore
        const updateProgress = async () => {
            if (!broadcastId) return;
            try {
                await db.collection('notifications_history').doc(broadcastId).update({
                    successCount: sentCount,
                    errorCount: errorCount,
                    progress: Math.min(100, Math.round(((sentCount + errorCount) / totalRecipients) * 100)),
                    status: 'sending',
                    sentTargets: sentTargets,
                });
            } catch {}
        };

        // ===== ENVIAR PARA USUÁRIOS COM RATE LIMITING =====
        for (const user of pendingTargetUsers) {
            const userPhoneClean = String(user.phone || '').replace(/\D/g, '');
            if (alreadySentSet.has(userPhoneClean)) {
                continue; // Pula os que já receberam neste mesmo disparo
            }

            const firstName = user.name 
                ? (user.name.trim().split(' ')[0].charAt(0).toUpperCase() + user.name.trim().split(' ')[0].slice(1).toLowerCase())
                : 'Membro';
                
            let userClassName = '';
            let userMissedLessonsText = 'Nenhuma falta';
            
            if (effectiveMessage && (effectiveMessage.includes('{{turma}}') || effectiveMessage.includes('{turma}') || effectiveMessage.includes('{{faltas}}') || effectiveMessage.includes('{faltas}'))) {
                try {
                    const classesSnap = await db.collection('classes').where('students', 'array-contains', user.id).get();
                    if (!classesSnap.empty) {
                        const userClass = classesSnap.docs[0].data();
                        userClassName = userClass.name || '';
                        
                        if (effectiveMessage.includes('{{faltas}}') || effectiveMessage.includes('{faltas}')) {
                            const attendance = userClass.attendance || [];
                            let lessonCounter = 0;
                            const missedLessons: string[] = [];
                            const sortedAttendance = [...attendance].sort((a, b) => a.date.localeCompare(b.date));
                            
                            sortedAttendance.forEach((record: any) => {
                                const isExtra = record.date.includes('T') || record.isRepositionOnly;
                                if (!isExtra) {
                                    lessonCounter++;
                                    const isPresent = record.presentStudentIds?.includes(user.id) || record.onlineStudentIds?.includes(user.id);
                                    if (!isPresent) {
                                        missedLessons.push(`Aula ${lessonCounter}`);
                                    }
                                }
                            });
                            userMissedLessonsText = missedLessons.length > 0 ? missedLessons.join(', ') : 'Nenhuma falta';
                        }
                    }
                } catch (e) {
                    console.error("Erro ao resolver turma/faltas para o usuário:", e);
                }
            }

            const messageWithVariables = (effectiveMessage || '')
                .replace(/\{\{nome\}\}/gi, firstName)
                .replace(/\{nome\}/gi, firstName)
                .replace(/\{\{turma\}\}/gi, userClassName)
                .replace(/\{turma\}/gi, userClassName)
                .replace(/\{\{faltas\}\}/gi, userMissedLessonsText)
                .replace(/\{faltas\}/gi, userMissedLessonsText);
            const personalizedBody = parseSpintax(messageWithVariables);
            const formattedPhone = formatWhatsAppNumber(String(user.phone || ''));

            await sendOne(formattedPhone, user.name, personalizedBody, user);
            messageIndex++;

            if (messageIndex > 0) {
                if (deepSleepFrequency > 0 && messageIndex % deepSleepFrequency === 0) {
                    await updateProgress();
                    console.log(`[Rate Limit] Pausa de Deep Sleep após ${messageIndex} mensagens...`);
                    await delay(deepSleepMin * 1000, deepSleepMax * 1000);
                } else if (microPauseFrequency > 0 && messageIndex % microPauseFrequency === 0) {
                    await updateProgress();
                    console.log(`[Rate Limit] Pausa de Micro-pausa após ${messageIndex} mensagens...`);
                    await delay(microPauseMin * 1000, microPauseMax * 1000);
                } else {
                    await delay(delayMin * 1000, delayMax * 1000);
                }
            }
        }

        // ===== ENVIAR PARA GRUPOS COM RATE LIMITING =====
        for (const groupId of targetGroups) {
            await sendOne(groupId, `Grupo ${groupId.split('@')[0]}`, parseSpintax(message || ''), groupId);
            messageIndex++;

            if (messageIndex > 0) {
                if (deepSleepFrequency > 0 && messageIndex % deepSleepFrequency === 0) {
                    await updateProgress();
                    console.log(`[Rate Limit] Pausa de Deep Sleep após ${messageIndex} mensagens (Grupos)...`);
                    await delay(deepSleepMin * 1000, deepSleepMax * 1000);
                } else if (microPauseFrequency > 0 && messageIndex % microPauseFrequency === 0) {
                    await updateProgress();
                    console.log(`[Rate Limit] Pausa de Micro-pausa após ${messageIndex} mensagens (Grupos)...`);
                    await delay(microPauseMin * 1000, microPauseMax * 1000);
                } else {
                    await delay(delayMin * 1000, delayMax * 1000);
                }
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
                    errors: errors,
                    failedTargets: failedTargets,
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
