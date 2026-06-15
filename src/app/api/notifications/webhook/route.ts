import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs'; // Garante execução em ambiente Node.js completo

/**
 * Robust Webhook for api-wa.me following data.msgContent pattern
 */
export async function POST(request: Request) {
  try {
    const db = getAdminDb();
    const raw = await request.json();
    const data = raw.data || raw;
    const msgContent = data.msgContent || data.message || {};
    
    // 1. Sender Identification
    const fromRaw = data.key?.remoteJid || data.from || data.participant || data.author;
    if (!fromRaw) return NextResponse.json({ success: true });

    // Extrair o número real, lidando com JIDs multi-device (ex: 5521999998888:1@s.whatsapp.net)
    // Pegamos a parte antes do @ e se houver :, pegamos a parte antes do :
    const fromParts = fromRaw.split('@')[0].split(':');
    let fromPhone = fromParts[0].replace(/\D/g, '');

    // CRITICAL: WhatsApp multi-device pode enviar respostas com LID (ex: 43817323462720@lid)
    // em vez do número real de telefone. Precisamos resolver LID -> telefone para vincular à campanha.
    const isLid = fromRaw.includes('@lid') || (fromPhone.length > 0 && !fromPhone.startsWith('55') && fromPhone.length < 13 && fromPhone.length > 8);
    
    if (isLid) {
        // ESTRATÉGIA 1: Usar campos do payload que já contêm o número real
        // A API api-wa.me envia 'phoneNumber' e 'jid' com o número real mesmo quando 'from' é LID
        const rawPhoneNumber = String(data.phoneNumber || '').replace(/\D/g, '');
        const rawJid = String(data.jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
        
        if (rawPhoneNumber.length >= 10) {
            fromPhone = rawPhoneNumber.startsWith('55') ? rawPhoneNumber : `55${rawPhoneNumber}`;
        } else if (rawJid.length >= 10 && rawJid.startsWith('55')) {
            fromPhone = rawJid;
        } else if (rawJid.length >= 10) {
            fromPhone = `55${rawJid}`;
        } else {
            // ESTRATÉGIA 2: Resolver via Firestore (mais lento mas robusto)
            const lidValue = fromParts[0];
            
            const userByLidSnap = await db.collection('users')
                .where('lid', '==', `${lidValue}@lid`)
                .limit(1)
                .get();
            
            if (!userByLidSnap.empty) {
                const userData = userByLidSnap.docs[0].data();
                const resolvedPhone = String(userData.phone || '').replace(/\D/g, '');
                if (resolvedPhone.length >= 10) {
                    fromPhone = resolvedPhone.startsWith('55') ? resolvedPhone : `55${resolvedPhone}`;
                }
            } else {
                const contactByLidSnap = await db.collection('notifications_contacts')
                    .where('lid', '==', `${lidValue}@lid`)
                    .limit(1)
                    .get();
                
                if (!contactByLidSnap.empty) {
                    const contactData = contactByLidSnap.docs[0].data();
                    const resolvedPhone = String(contactData.phoneNumber || '').replace(/\D/g, '');
                    if (resolvedPhone.length >= 10) {
                        fromPhone = resolvedPhone;
                    }
                }
            }
        }
    }

    // Pegamos o ID da mensagem que está sendo respondida (se houver)
    let stanzaId = msgContent.contextInfo?.stanzaId || data.contextInfo?.stanzaId || data.stanzaId || null;
    
    if (!stanzaId && msgContent.interactiveResponseMessage?.contextInfo?.stanzaId) {
        stanzaId = msgContent.interactiveResponseMessage.contextInfo.stanzaId;
    }
    if (!stanzaId && msgContent.buttonsResponseMessage?.contextInfo?.stanzaId) {
        stanzaId = msgContent.buttonsResponseMessage.contextInfo.stanzaId;
    }
    if (!stanzaId && msgContent.templateButtonReplyMessage?.contextInfo?.stanzaId) {
        stanzaId = msgContent.templateButtonReplyMessage.contextInfo.stanzaId;
    }
    if (!stanzaId && msgContent.listResponseMessage?.contextInfo?.stanzaId) {
        stanzaId = msgContent.listResponseMessage.contextInfo.stanzaId;
    }

    // Para enquetes, o ID da mensagem original costuma estar em pollCreationMessageKey.id
    if (!stanzaId) {
        const pollData = msgContent.pollUpdateMessage || data.pollUpdates || data.pollUpdate || data.pollUpdateMessage || {};
        const pollUpdate = Array.isArray(pollData) ? pollData[0] : pollData;
        stanzaId = pollUpdate.pollCreationMessageKey?.id || data.pollCreationMessageKey?.id || null;
    }

    // Também tentar extrair stanzaId do key.id (para mensagens interativas respondidas)
    if (!stanzaId && data.key?.id) {
        // Não usar key.id como stanzaId se for a própria mensagem; só usar se houver contexto
    }

    // 2. Identify Message Type and Payload
    let responseType: 'button' | 'poll' | 'text' | null = null;
    let payload: any = null;

    // B. Button / List / Interactive Response
    if (
        msgContent.buttonsResponseMessage || 
        msgContent.templateButtonReplyMessage || 
        msgContent.listResponseMessage ||
        data.buttonsResponseMessage ||
        data.templateButtonReplyMessage ||
        data.listResponseMessage ||
        msgContent.interactiveResponseMessage
    ) {
        const btn = msgContent.buttonsResponseMessage || data.buttonsResponseMessage || {};
        const tmpl = msgContent.templateButtonReplyMessage || data.templateButtonReplyMessage || {};
        const list = msgContent.listResponseMessage || data.listResponseMessage || {};
        const interactive = msgContent.interactiveResponseMessage || data.interactiveResponseMessage || {};
        
        let buttonId = btn.selectedButtonId || tmpl.selectedId || list.singleSelectReply?.selectedRowId;
        let buttonText = btn.selectedDisplayText || tmpl.selectedDisplayText || list.title;

        // Suporte para Interactive Messages do Evolution/Baileys
        if (!buttonId && interactive.nativeFlowResponseMessage) {
            const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson || '{}');
            buttonId = params.id;
            buttonText = params.text || 'Botão clicado';
        }

        responseType = 'button';
        payload = {
            buttonId: buttonId || 'click',
            buttonText: buttonText || 'Opção selecionada'
        };
    }
    // C. Poll Update (pollUpdateMessage)
    else if (msgContent.pollUpdateMessage || data.pollUpdates || data.pollUpdate || data.pollUpdateMessage) {
        const pollData = msgContent.pollUpdateMessage || data.pollUpdates || data.pollUpdate || data.pollUpdateMessage || {};
        
        const pollUpdate = Array.isArray(pollData) ? pollData[0] : pollData;
        
        let options = pollUpdate.vote?.selectedOptions || pollUpdate.selectedOptions || data.selectedOptions || [];
        if (!Array.isArray(options)) options = [options].filter(Boolean);
        
        // IMPORTANTE: NÃO usar pollCreationMessageKey.id como pollName — é um message ID, não um nome legível!
        const pollName = data.pollName || pollUpdate.name || pollUpdate.pollName || msgContent.pollCreationMessage?.name || 'Enquete';

        options = options.map((o: any) => typeof o === 'string' ? o : o.label || o.text || o.name).filter(Boolean);
        if (options.length === 0) options = ['Voto registrado'];

        responseType = 'poll';
        payload = {
            pollName,
            selectedOptions: options
        };
    }

    // ===== DEBUG: Log detalhado para diagnóstico do Bot GC =====
    const textForDebug = msgContent.conversation || msgContent.extendedTextMessage?.text || data.text || '';
    console.log(`[Webhook DEBUG] fromPhone=${fromPhone}, fromRaw=${fromRaw}, fromMe=${data.fromMe}, isLid=${fromRaw.includes('@lid')}, text="${textForDebug}", responseType=${responseType}`);

    // Interceptor para o Bot de Relatório de GC se houver sessão ativa
    // Relaxar a condição: aceitar fromMe === undefined como "não é de mim"
    const isFromMe = data.fromMe === true;
    const isGroup = fromRaw.includes('@g.us');
    
    if (!isFromMe && !isGroup) {
        console.log(`[Webhook DEBUG] Checando sessão GC para fromPhone=${fromPhone}...`);
        
        // Tentar múltiplos formatos de telefone para encontrar a sessão
        let sessionDoc = await db.collection('gc_report_sessions').doc(fromPhone).get();
        let sessionPhone = fromPhone;
        
        if (!sessionDoc.exists && fromPhone.startsWith('55')) {
            // Tentar sem o prefixo 55
            const withoutPrefix = fromPhone.substring(2);
            console.log(`[Webhook DEBUG] Sessão não encontrada com ${fromPhone}, tentando ${withoutPrefix}...`);
            sessionDoc = await db.collection('gc_report_sessions').doc(withoutPrefix).get();
            if (sessionDoc.exists) sessionPhone = withoutPrefix;
        }
        
        if (!sessionDoc.exists && !fromPhone.startsWith('55')) {
            // Tentar com o prefixo 55
            const withPrefix = `55${fromPhone}`;
            console.log(`[Webhook DEBUG] Sessão não encontrada com ${fromPhone}, tentando ${withPrefix}...`);
            sessionDoc = await db.collection('gc_report_sessions').doc(withPrefix).get();
            if (sessionDoc.exists) sessionPhone = withPrefix;
        }
        
        console.log(`[Webhook DEBUG] Sessão GC existe? ${sessionDoc.exists} (phone usado: ${sessionPhone})`);
        
        if (sessionDoc.exists) {
            let messageText = '';
            if (responseType === 'button') {
                messageText = payload?.buttonText || '';
            } else if (responseType === 'poll') {
                messageText = Array.isArray(payload?.selectedOptions) ? payload.selectedOptions.join(', ') : '';
            } else {
                messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || data.text || '';
            }

            console.log(`[Webhook DEBUG] Encaminhando para GC Bot: messageText="${messageText}", type=${responseType || 'text'}`);
            const { handleGcReportIncomingMessage } = await import('@/lib/gc-report-bot');
            await handleGcReportIncomingMessage(
                sessionPhone,
                messageText,
                responseType || 'text',
                payload
            );
            return NextResponse.json({ success: true });
        }
    } else {
        console.log(`[Webhook DEBUG] Mensagem ignorada pelo Bot GC: isFromMe=${isFromMe}, isGroup=${isGroup}`);
    }

    // D. Common Text
    if (msgContent.conversation || msgContent.extendedTextMessage?.text || data.text) {
        const messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || data.text || '[Mídia]';
        const senderPushName = data.pushName || data.senderName || data.verifiedName || null;

        
        await db.collection('notifications_messages').add({
          from: fromPhone,
          fromMe: data.fromMe || false,
          content: messageText,
          type: 'text',
          receivedAt: Timestamp.now()
        });

        await db.collection('notifications_chats').doc(fromPhone).set({
            lastMessage: messageText,
            lastMessageAt: Timestamp.now(),
            unreadCount: data.fromMe ? 0 : 1,
            phoneNumber: fromPhone,
            userName: senderPushName, // Salva o nome vindo do WhatsApp como fallback
            isGroup: fromRaw.includes('@g.us')
        }, { merge: true });

        // Detecção de Opt-Out / Opt-In (somente mensagens individuais recebidas)
        if (!data.fromMe && !fromRaw.includes('@g.us')) {
            const normalizedText = messageText.trim().toLowerCase();
            const optOutKeywords = ['sair', 'parar', 'cancelar', 'descadastrar', 'unsubscribe', 'remover'];
            const optInKeywords = ['iniciar', 'começar', 'voltar', 'subscribe', 'ativar'];

            if (optOutKeywords.includes(normalizedText)) {
                // Adiciona na blacklist do Firestore
                await db.collection('notifications_blacklist').doc(fromPhone).set({
                    phoneNumber: fromPhone,
                    blacklistedAt: Timestamp.now(),
                    reason: `Palavra-chave recebida: ${messageText}`
                });

                // Envia confirmação de remoção de volta ao usuário
                try {
                    const configSnap = await db.collection('config').doc('notifications').get();
                    if (configSnap.exists) {
                        const config = configSnap.data();
                        const apiKey = config?.instanceKey || config?.whatsappApiKey;
                        const serverUrl = config?.serverUrl || 'https://us.api-wa.me';
                        if (apiKey) {
                            const { getWhatsAppClient } = await import('@/lib/whatsapp');
                            const whatsapp = await getWhatsAppClient({ server: serverUrl, key: apiKey });
                            await whatsapp.sendMessage({
                                type: 'text',
                                body: {
                                    to: fromRaw,
                                    text: 'Seu número foi removido da nossa lista de envios. Você não receberá novas mensagens de transmissão. Se quiser voltar a receber, envie COMEÇAR. 🛑'
                                }
                            });
                        }
                    }
                } catch (sendErr: any) {
                    console.error('Falha ao enviar mensagem de confirmação de opt-out:', sendErr.message);
                }
            } else if (optInKeywords.includes(normalizedText)) {
                // Remove da blacklist se constar lá
                const blacklistRef = db.collection('notifications_blacklist').doc(fromPhone);
                const blacklistDoc = await blacklistRef.get();
                if (blacklistDoc.exists) {
                    await blacklistRef.delete();

                    // Envia confirmação de reativação de volta ao usuário
                    try {
                        const configSnap = await db.collection('config').doc('notifications').get();
                        if (configSnap.exists) {
                            const config = configSnap.data();
                            const apiKey = config?.instanceKey || config?.whatsappApiKey;
                            const serverUrl = config?.serverUrl || 'https://us.api-wa.me';
                            if (apiKey) {
                                const { getWhatsAppClient } = await import('@/lib/whatsapp');
                                const whatsapp = await getWhatsAppClient({ server: serverUrl, key: apiKey });
                                await whatsapp.sendMessage({
                                    type: 'text',
                                    body: {
                                        to: fromRaw,
                                        text: 'Seu número foi reativado! Você voltou a fazer parte da nossa lista de envios. 👍'
                                    }
                                });
                            }
                        }
                    } catch (sendErr: any) {
                        console.error('Falha ao enviar mensagem de confirmação de opt-in:', sendErr.message);
                    }
                }
            }
        }
    }

    // LOG: Salvar log bruto para depuração se não for apenas texto comum ou se o usuário pediu
    if (responseType && responseType !== 'text') {
        try {
            await db.collection('notifications_logs').add({
                receivedAt: Timestamp.now(),
                from: fromRaw,
                phone: fromPhone,
                type: responseType,
                payload: payload,
                stanzaId: stanzaId,
                raw: data // Payload completo para análise
            });
        } catch (e) {
            console.error("Erro ao salvar log de notificação:", e);
        }
    }

    // 3. Save Interactions
    if (responseType && payload) {
        // Remove undefined fields strictly to prevent Firestore crash
        const sanitizedPayload = JSON.parse(JSON.stringify(payload));
        
        try {
            // Tentar vincular com um broadcastId via stanzaId
            let broadcastId = null;
            
            // Estratégia 1: Buscar pelo stanzaId exato (ideal para botões que referenciam a msg original)
            if (stanzaId) {
                const sentMsgSnap = await db.collection('notifications_sent_messages')
                    .where('messageId', '==', stanzaId)
                    .limit(1)
                    .get();
                
                if (!sentMsgSnap.empty) {
                    broadcastId = sentMsgSnap.docs[0].data().broadcastId;
                }
            }

            // Estratégia 2: Se não encontrou pelo stanzaId, buscar a última mensagem enviada para esse telefone
            // IMPORTANTE: Só considerar mensagens das últimas 24h para evitar vincular a campanhas antigas
            if (!broadcastId && fromPhone) {
                try {
                    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const cutoffTimestamp = Timestamp.fromDate(cutoff24h);
                    
                    const byRecipientSnap = await db.collection('notifications_sent_messages')
                        .where('recipient', '==', fromPhone)
                        .where('sentAt', '>=', cutoffTimestamp)
                        .orderBy('sentAt', 'desc')
                        .limit(1)
                        .get();
                    
                    if (!byRecipientSnap.empty) {
                        broadcastId = byRecipientSnap.docs[0].data().broadcastId;
                    }
                } catch (indexError: any) {
                    // Fallback: se o índice composto não existe, buscar apenas por recipient
                    console.warn('Índice composto não encontrado, usando fallback simples:', indexError.message);
                    const fallbackSnap = await db.collection('notifications_sent_messages')
                        .where('recipient', '==', fromPhone)
                        .limit(5)
                        .get();
                    
                    if (!fallbackSnap.empty) {
                        // Filtrar manualmente por tempo e pegar a mais recente
                        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
                        let latest: any = null;
                        fallbackSnap.docs.forEach(d => {
                            const data = d.data();
                            const sentAtMs = data.sentAt?.toMillis?.() || 0;
                            if (sentAtMs >= cutoff && (!latest || sentAtMs > (latest.sentAt?.toMillis?.() || 0))) {
                                latest = data;
                            }
                        });
                        if (latest) broadcastId = latest.broadcastId;
                    }
                }
            }

            // Enriquecer com nome real da enquete se possível
            // Detectar pollNames que são IDs hex (ex: 3EB08140259CF4F5B410B1)
            const isHexPollName = sanitizedPayload.pollName && /^[0-9A-F]{16,}$/i.test(sanitizedPayload.pollName);
            if (responseType === 'poll' && broadcastId && (!sanitizedPayload.pollName || sanitizedPayload.pollName === 'Enquete' || isHexPollName || sanitizedPayload.pollName.length > 50)) {
                const broadcastDoc = await db.collection('notifications_history').doc(broadcastId).get();
                if (broadcastDoc.exists) {
                    const bData = broadcastDoc.data();
                    sanitizedPayload.pollName = bData?.surveyName || bData?.message?.slice(0, 50) || sanitizedPayload.pollName;
                }
            }

            await db.collection('notifications_responses').add({
                ...sanitizedPayload,
                type: responseType,
                from: fromPhone,
                fromRaw: fromRaw,
                stanzaId: stanzaId,
                broadcastId: broadcastId,
                receivedAt: Timestamp.now(),
            });
        } catch (error: any) {
            console.error('Firestore Response Error:', error);
        }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    // Return 200 even on error so API-WA doesn't disable the webhook
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
