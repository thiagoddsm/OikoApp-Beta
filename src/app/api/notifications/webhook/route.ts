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
    console.log("RAW WEBHOOK PAYLOAD:", JSON.stringify(raw, null, 2));
    
    // Tratamento para arrays (ex: pollUpdates) e estrutura de dados
    let data = raw.data || raw;
    if (Array.isArray(data)) data = data[0];
    
    // Suporte para Evolution API v2 (messages.upsert)
    const isEvolutionV2 = raw.event === 'messages.upsert' && !!data.message;
    const msgObject = isEvolutionV2 ? data.message : data;
    const msgContent = isEvolutionV2 ? (msgObject.message || {}) : (msgObject.msgContent || msgObject.message || {});
    
    // 1. Sender Identification
    let fromRaw = String(
        msgObject.from || 
        msgObject.key?.remoteJid || 
        msgObject.participant || 
        msgObject.author || 
        msgObject.pollCreationMessageKey?.remoteJid || 
        data.key?.remoteJid || 
        data.participant ||
        ''
    );

    if (!fromRaw) {
        console.log("NO FROM RAW! Returning early.");
        return NextResponse.json({ success: true });
    }

    // Extrair o número real, lidando com JIDs multi-device (ex: 5521999998888:1@s.whatsapp.net)
    // Pegamos a parte antes do @ e se houver :, pegamos a parte antes do :
    const fromParts = fromRaw.split('@')[0].split(':');
    let fromPhone = fromParts[0].replace(/\D/g, '');

    // CRITICAL: WhatsApp multi-device pode enviar respostas com LID (ex: 43817323462720@lid)
    // em vez do número real de telefone. Precisamos resolver LID -> telefone para vincular à campanha.
    const isLid = fromRaw.includes('@lid') || (fromPhone.length > 0 && !fromPhone.startsWith('55') && fromPhone.length < 13 && fromPhone.length > 8);
    
    if (isLid) {
        // ESTRATÉGIA 1: Usar phoneNumber se a API conseguir resolver
        const rawPhoneNumber = String(msgObject.phoneNumber || data.phoneNumber || '').replace(/\D/g, '');
        
        if (rawPhoneNumber.length >= 10) {
            fromPhone = rawPhoneNumber.startsWith('55') ? rawPhoneNumber : `55${rawPhoneNumber}`;
        } else {
            // ESTRATÉGIA 2: Tentar resolver via Firestore (se já salvamos o lid na collection de contatos)
            const lidValue = fromParts[0];
            
            try {
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
                            fromPhone = resolvedPhone.startsWith('55') ? resolvedPhone : `55${resolvedPhone}`;
                        }
                    }
                }
            } catch (e) {
                // Ignore DB errors during resolution
            }
            
            // Se não conseguimos resolver, fromPhone vai continuar sendo o número do LID (ex: 43817323462720)
            // Isso nos permite continuar a sessão usando o LID como chave.
        }
    }

    // Pegamos o ID da mensagem que está sendo respondida (se houver)
    let stanzaId = msgContent.contextInfo?.stanzaId || msgObject.contextInfo?.stanzaId || msgObject.stanzaId || null;
    
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
        const pollData = msgContent.pollUpdateMessage || msgObject.pollUpdates || msgObject.pollUpdate || msgObject.pollUpdateMessage || {};
        const pollUpdate = Array.isArray(pollData) ? pollData[0] : pollData;
        stanzaId = pollUpdate.pollCreationMessageKey?.id || msgObject.pollCreationMessageKey?.id || null;
    }

    // Também tentar extrair stanzaId do key.id (para mensagens interativas respondidas)
    if (!stanzaId && msgObject.key?.id) {
        // Não usar key.id como stanzaId se for a própria mensagem; só usar se houver contexto
    }

    // 2. Identify Message Type and Payload
    let responseType: string | null = null;
    let payload: any = null;

    // B. Button / List / Interactive Response
    if (
        msgContent.buttonsResponseMessage || 
        msgContent.templateButtonReplyMessage || 
        msgContent.listResponseMessage ||
        msgObject.buttonsResponseMessage ||
        msgObject.templateButtonReplyMessage ||
        msgObject.listResponseMessage ||
        msgContent.interactiveResponseMessage
    ) {
        const btn = msgContent.buttonsResponseMessage || msgObject.buttonsResponseMessage || {};
        const tmpl = msgContent.templateButtonReplyMessage || msgObject.templateButtonReplyMessage || {};
        const list = msgContent.listResponseMessage || msgObject.listResponseMessage || {};
        const interactive = msgContent.interactiveResponseMessage || msgObject.interactiveResponseMessage || {};
        
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
    // Detecta tanto pelo messageType no data como pelo conteúdo do message
    else if (data.messageType === 'pollUpdateMessage' || msgContent.pollUpdateMessage || msgObject.pollUpdateMessage || msgObject.pollUpdates || msgObject.pollUpdate) {
        
        // ─── ESTRATÉGIA PRINCIPAL: Evolution API v2 descriptografa os votos e entrega
        // em data.pollUpdates como array de { name: string, voters: string[] }.
        // O estado é ACUMULADO: a cada evento, representa quem votou ATÉ AGORA.
        // Nomes com voters.length > 0 = votaram. Nomes com voters = [] = não votaram / desmarcaram.
        let options: string[] = [];
        
        if (Array.isArray(data.pollUpdates) && data.pollUpdates.length > 0) {
            options = data.pollUpdates
                .filter((pu: any) => Array.isArray(pu.voters) && pu.voters.length > 0)
                .map((pu: any) => String(pu.name || '').trim())
                .filter(Boolean);
        }
        
        // Fallback 1: Se a Evolution API enviar no update com pollUpdates dentro do objeto root de data
        if (options.length === 0 && Array.isArray(data.pollUpdate?.pollUpdates)) {
            options = data.pollUpdate.pollUpdates
                .filter((pu: any) => Array.isArray(pu.voters) && pu.voters.length > 0)
                .map((pu: any) => String(pu.name || '').trim())
                .filter(Boolean);
        }
        
        // Fallback 2: tentar extrair de pollUpdateMessage.vote.selectedOptions (decodificado pela Evolution API em algumas instâncias de webhook)
        if (options.length === 0) {
            const pollUpdateMsg = data.message?.pollUpdateMessage || msgObject.pollUpdateMessage || msgContent.pollUpdateMessage || {};
            const rawSelected = pollUpdateMsg.vote?.selectedOptions || [];
            options = rawSelected
                .map((o: any) => typeof o === 'string' ? o : o.name || o.label || o.text || '')
                .filter(Boolean);
        }

        if (!Array.isArray(options)) options = [options].filter(Boolean);
        if (options.length === 0) options = ['Voto registrado'];
        
        // Nome da enquete
        const pollUpdateMsg = msgObject.pollUpdateMessage || msgContent.pollUpdateMessage || {};
        const pollName = msgContent.pollCreationMessage?.name || msgObject.pollName || 'Enquete';
        const pollCreationId = pollUpdateMsg.pollCreationMessageKey?.id || stanzaId;

        responseType = 'poll';
        payload = {
            pollName: pollName, // Garante que a propriedade do payload seja exatamente pollName (com minúsculas/maiúsculas consistentes)
            pollId: pollCreationId || pollName,
            selectedOptions: options,
            allPollUpdates: data.pollUpdates || [],
        };

        // Ignorar webhooks WAME sem dados legíveis (o payload do voto é criptografado no WAME)
        if (!raw.event && options.length === 0) {
            console.log('[Webhook DEBUG] Ignorando webhook de poll do WAME (sem opções legíveis), aguardando Evolution API...');
            return NextResponse.json({ success: true, ignored: true, reason: 'wame_poll_ignore' });
        }
    } else {
        responseType = 'text';
    }

    // ===== DEBUG: Log detalhado para diagnóstico do Bot GC =====
    const textForDebug = msgContent.conversation || msgContent.extendedTextMessage?.text || msgObject.text || '';
    console.log(`[Webhook DEBUG] fromPhone=${fromPhone}, fromRaw=${fromRaw}, fromMe=${msgObject.key?.fromMe ?? msgObject.fromMe}, isLid=${fromRaw.includes('@lid')}, text="${textForDebug}", responseType=${responseType}`);
    
    // Deduplicação de Mensagens (Evitar que WAME e Evolution processem a mesma mensagem 2 vezes)
    // Como WAME e Evolution geram IDs diferentes para a mesma mensagem recebida, 
    // vamos deduplicar por (fromPhone + hash(texto/botao)).
    const contentString = (responseType === 'button' ? (payload?.buttonId || payload?.buttonText || 'click') : textForDebug) || 'empty';
    // Limita o tamanho para usar como ID do Firestore
    const contentHash = contentString.substring(0, 50).replace(/[^a-zA-Z0-9_-]/g, '');
    const dedupKey = `${fromPhone}_${contentHash}`;
    
    if (responseType === 'text' || responseType === 'button') {
        try {
            const dedupRef = db.collection('webhook_dedup').doc(dedupKey);
            const isDuplicate = await db.runTransaction(async (t) => {
                const dedupDoc = await t.get(dedupRef);
                if (dedupDoc.exists) {
                    const data = dedupDoc.data();
                    const diffMs = Date.now() - (data?.timestamp?.toMillis() || 0);
                    if (diffMs < 5000) {
                        return true;
                    }
                }
                t.set(dedupRef, { timestamp: Timestamp.now() });
                return false;
            });
            
            if (isDuplicate) {
                console.log(`[Webhook DEBUG] Mensagem duplicada ignorada (Transação atômica): ${dedupKey}`);
                return NextResponse.json({ success: true, ignored: true, reason: 'duplicate' });
            }
        } catch (e) {
            console.error("DEDUP LOG ERROR:", e); 
        }
    }
    
    // Para enquetes: cada evento de voto tem um data.key.id ÚNICO.
    // Usamos ele como chave de dedup para garantir que CADA MUDANÇA de voto seja processada.
    // Importante: Se este webhook contiver a descriptografia real (nomes reais selecionados), 
    // nós permitimos que ele ignore a trava e sobrescreva o webhook "vazio" anterior.
    if (responseType === 'poll') {
        try {
            const voteMessageId = data.key?.id || msgObject.key?.id;
            const dedupPollId = voteMessageId
                ? `poll_vote_${voteMessageId}`
                : `${stanzaId}_${fromPhone}_${Date.now()}`;
            
            const hasDecryptedOptions = Array.isArray(payload?.selectedOptions) && 
                                        payload.selectedOptions.length > 0 && 
                                        payload.selectedOptions[0] !== 'Voto registrado';

            const dedupRef = db.collection('webhook_dedup').doc(dedupPollId);
            const dedupDoc = await dedupRef.get();
            if (dedupDoc.exists && !hasDecryptedOptions) {
                console.log(`[Webhook DEBUG] Evento de enquete duplicado ignorado (mesmo key.id): ${dedupPollId}`);
                return NextResponse.json({ success: true, ignored: true, reason: 'duplicate_poll' });
            }
            // TTL implícito
            await dedupRef.set({ timestamp: Timestamp.now(), stanzaId: stanzaId || null });
        } catch (e) { console.error("DEDUP POLL ERROR:", e); }
    }
    
    // Gravar log de debug no Firestore para diagnóstico remoto
    try {
      await db.collection('gc_bot_debug').add({
        fromPhone: fromPhone || '',
        fromRaw: fromRaw || '',
        fromMe: msgObject.key?.fromMe ?? msgObject.fromMe ?? false,
        text: textForDebug || '',
        responseType: responseType || 'text',
        payload: payload || null,
        rawPollUpdate: msgContent.pollUpdateMessage || null,
        isLid: fromRaw.includes('@lid'),
        receivedAt: Timestamp.now(),
        rawKeys: Object.keys(data || {}).join(', '),
        msgContentKeys: Object.keys(msgContent || {}).join(', '),
      });
    } catch (e) { console.error("DEBUG LOG ERROR:", e); }

    // Relaxar a condição: aceitar fromMe === undefined como "não é de mim"
    // IMPORTANTE: Para Enquetes (responseType === 'poll'), o msgObject.key refere-se à mensagem ORIGINAL (enviada pelo bot). 
    // Logo, fromMe virá true. Para não bloquear o voto do usuário, ignoramos o fromMe se for poll update.
    const isFromMe = (msgObject.key?.fromMe === true || msgObject.fromMe === true) && responseType !== 'poll';
    const isGroup = fromRaw.includes('@g.us');
    
    if (!isFromMe && !isGroup) {
        // ── Confirmação de Escala via WhatsApp ──────────────────────────────
        // Intercept SIM / NÃO replies before passing to GC Bot
        const rawTextForConfirm = (msgContent.conversation || msgContent.extendedTextMessage?.text || msgObject.text || '').trim().toUpperCase();
        if (rawTextForConfirm === 'SIM' || rawTextForConfirm === 'NÃO' || rawTextForConfirm === 'NAO') {
            try {
                const configSnap = await db.collection('config').doc('notifications').get();
                const waConf = configSnap.exists ? configSnap.data() : {};
                const { handleScheduleConfirmation } = await import('@/lib/schedule-confirmation');
                const wasHandled = await handleScheduleConfirmation(fromPhone, rawTextForConfirm, waConf);
                if (wasHandled) {
                    console.log(`[Webhook] Resposta de escala processada para ${fromPhone}: ${rawTextForConfirm}`);
                    return NextResponse.json({ success: true });
                }
            } catch (confErr: any) {
                console.error('[Webhook] Erro no handler de confirmação de escala:', confErr.message);
            }
        }
        // ── Fim confirmação de escala ──────────────────────────────────────

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
                messageText = payload?.buttonId || payload?.buttonText || '';
            } else if (responseType === 'poll') {
                messageText = Array.isArray(payload?.selectedOptions) ? payload.selectedOptions.join(', ') : '';
            } else {
                messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || msgObject.text || '';
            }

            console.log(`[Webhook DEBUG] Encaminhando para GC Bot: messageText="${messageText}", type=${responseType || 'text'}`);
            const { handleGcReportIncomingMessage } = await import('@/lib/gc-report-bot');
            await handleGcReportIncomingMessage(
                sessionPhone,
                messageText,
                (responseType || 'text') as 'text' | 'button' | 'poll',
                payload
            );
            return NextResponse.json({ success: true });
        }
    } else {
        console.log(`[Webhook DEBUG] Mensagem ignorada pelo Bot GC: isFromMe=${isFromMe}, isGroup=${isGroup}`);
    }

    // D. Common Text and Interactions
    let messageText = '';
    if (responseType === 'button') {
        messageText = `[Botão] ${payload?.buttonText || ''}`;
    } else if (responseType === 'poll') {
        messageText = `[Enquete] ${Array.isArray(payload?.selectedOptions) ? payload.selectedOptions.join(', ') : ''}`;
    } else {
        messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || msgObject.text || '';
        if (!messageText && raw.event === 'messages.upsert') {
             // Tratamento genérico para outras mídias
             if (msgContent.imageMessage) messageText = '[Imagem]';
             else if (msgContent.audioMessage) messageText = '[Áudio]';
             else if (msgContent.videoMessage) messageText = '[Vídeo]';
             else if (msgContent.documentMessage) messageText = '[Documento]';
             else if (msgContent.contactMessage) messageText = '[Contato]';
        }
    }

    if (messageText) {
        const senderPushName = msgObject.pushName || msgObject.senderName || msgObject.verifiedName || null;

        await db.collection('notifications_messages').add({
          from: fromPhone,
          fromMe: isFromMe,
          content: messageText,
          type: responseType || 'text',
          receivedAt: Timestamp.now()
        });

        await db.collection('notifications_chats').doc(fromPhone).set({
            lastMessage: messageText,
            lastMessageAt: Timestamp.now(),
            unreadCount: isFromMe ? 0 : 1,
            phoneNumber: fromPhone,
            userName: senderPushName, // Salva o nome vindo do WhatsApp como fallback
            isGroup: fromRaw.includes('@g.us')
        }, { merge: true });

        // Detecção de Opt-Out / Opt-In (somente mensagens individuais recebidas)
        if (!isFromMe && !isGroup) {
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
    if (responseType && (responseType as string) !== 'text') {
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
