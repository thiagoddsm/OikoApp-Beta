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
    const fromPhone = fromParts[0].replace(/\D/g, '');

    // Pegamos o ID da mensagem que está sendo respondida (se houver)
    const stanzaId = msgContent.contextInfo?.stanzaId || data.contextInfo?.stanzaId || data.stanzaId || null;

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
        
        const pollName = data.pollName || pollUpdate.name || pollUpdate.pollName || msgContent.pollCreationMessage?.name || pollUpdate.pollCreationMessageKey?.id || 'Enquete';

        options = options.map((o: any) => typeof o === 'string' ? o : o.label || o.text || o.name).filter(Boolean);
        if (options.length === 0) options = ['Voto registrado'];

        responseType = 'poll';
        payload = {
            pollName,
            selectedOptions: options
        };
    }
    // D. Common Text
    else if (msgContent.conversation || msgContent.extendedTextMessage?.text || data.text) {
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
            if (stanzaId) {
                const sentMsgSnap = await db.collection('notifications_sent_messages')
                    .where('messageId', '==', stanzaId)
                    .limit(1)
                    .get();
                
                if (!sentMsgSnap.empty) {
                    broadcastId = sentMsgSnap.docs[0].data().broadcastId;
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
