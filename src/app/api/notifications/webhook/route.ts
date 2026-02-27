
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, setDoc, doc } from 'firebase/firestore';

/**
 * Webhook robusto para api-wa.me (Baseado no padrão msgContent da API)
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    
    // A API envia os dados dentro de 'data'. 
    // Se não houver 'data', usamos o objeto raiz por segurança.
    const data = raw.data || raw;
    const msgContent = data.msgContent || data.message || {};
    
    // 1. Identificação do Remetente
    const fromRaw = data.key?.remoteJid || data.from || data.participant || data.author;
    if (!fromRaw) {
        return NextResponse.json({ success: true, message: 'Ignorado: Evento sem JID' });
    }

    const { firestore } = initializeFirebase();
    const fromPhone = fromRaw.split('@')[0].replace(/\D/g, '');

    // 2. Busca do Usuário no OikoApp (Otimizada)
    let userId = 'unknown';
    let userName = 'Desconhecido';
    
    try {
        const usersRef = collection(firestore, 'users');
        const searchDigits = fromPhone.slice(-8);
        const q = query(usersRef, where('phone', '>=', searchDigits)); 
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          const cleanUserPhone = (userData.phone || '').replace(/\D/g, '');
          if (cleanUserPhone.endsWith(searchDigits)) {
              userId = docSnap.id;
              userName = userData.name;
          }
        });
    } catch (e) {
        console.error("Erro na busca de usuário:", e);
    }

    // 3. Processamento por Tipo de Mensagem (Padrão api-wa.me)
    const messageType = data.messageType || 'unknown';
    let responseType: 'button' | 'poll' | 'text' | null = null;
    let payload: any = null;

    // A. Resposta de Botão
    if (msgContent.buttonsResponseMessage || data.type === 'buttons_response') {
        const btnResp = msgContent.buttonsResponseMessage || {};
        responseType = 'button';
        payload = {
            buttonId: btnResp.selectedButtonId || data.id || 'unknown',
            buttonText: btnResp.selectedDisplayText || data.text || 'Botão clicado'
        };
    } 
    // B. Resposta de Lista
    else if (msgContent.listResponseMessage) {
        const listResp = msgContent.listResponseMessage;
        responseType = 'button'; // Tratamos lista como botão para simplificar UI
        payload = {
            buttonId: listResp.singleSelectReply?.selectedRowId || 'unknown',
            buttonText: listResp.title || listResp.description || 'Item selecionado'
        };
    }
    // C. Atualização de Enquete (Poll)
    else if (msgContent.pollUpdateMessage || data.pollUpdates || data.type === 'poll_update') {
        const poll = msgContent.pollUpdateMessage || data.pollUpdates || {};
        responseType = 'poll';
        payload = {
            pollName: poll.name || data.pollName || 'Enquete',
            selectedOptions: Array.isArray(poll.selectedOptions) ? poll.selectedOptions : [poll.selectedOptions]
        };
    }
    // D. Texto Comum
    else if (msgContent.conversation || msgContent.extendedTextMessage?.text || data.body || data.text) {
        const messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || data.body || data.text || '[Mídia]';
        
        // Salva no histórico de mensagens (Aba Conversas)
        await addDoc(collection(firestore, 'notifications_messages'), {
          from: fromPhone,
          fromMe: data.fromMe || false,
          userId,
          userName,
          content: messageText,
          type: 'text',
          receivedAt: Timestamp.now()
        });

        // Atualiza a barra lateral de chats
        await setDoc(doc(firestore, 'notifications_chats', fromPhone), {
            lastMessage: messageText,
            lastMessageAt: Timestamp.now(),
            unreadCount: data.fromMe ? 0 : 1,
            userName,
            userId,
            phoneNumber: fromPhone,
            isGroup: fromRaw.includes('@g.us')
        }, { merge: true });
    }

    // 4. Salva interações na coleção de Respostas (Aba Respostas)
    if (responseType && payload) {
        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: responseType,
            ...payload,
            receivedAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro crítico no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
