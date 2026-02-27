
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, setDoc, doc } from 'firebase/firestore';

/**
 * Webhook Route robusto para api-wa.me
 * Processa mensagens, cliques em botões e votos em enquetes.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    // A API pode enviar os dados direto ou dentro de uma propriedade 'data'
    const data = payload.data || payload;

    // Identificação do remetente (pode vir em campos diferentes dependendo do evento)
    const fromRaw = data.from || data.key?.remoteJid || data.participant || data.author;
    if (!fromRaw) {
        return NextResponse.json({ success: true, message: 'Ignorado: Sem remetente' });
    }

    const { firestore } = initializeFirebase();
    
    // Limpeza do número de telefone (remove @s.whatsapp.net ou @g.us)
    const fromPhone = fromRaw.split('@')[0].replace(/\D/g, '');

    // 1. Tenta identificar o usuário na base IBM
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
        console.error("Erro ao buscar usuário no webhook:", e);
    }

    const eventType = data.type || 'text';
    
    // 2. Processamento de Mensagem de Texto Comum
    if (eventType === 'text' || data.body || data.text || data.message?.conversation) {
        const messageContent = data.body || data.text || data.message?.conversation || '[Mídia/Outro]';

        // Salva a mensagem individual
        await addDoc(collection(firestore, 'notifications_messages'), {
          from: fromPhone,
          fromMe: data.fromMe || false,
          userId,
          userName,
          content: messageContent,
          type: 'text',
          receivedAt: Timestamp.now()
        });

        // Atualiza o resumo da conversa (Sidebar)
        await setDoc(doc(firestore, 'notifications_chats', fromPhone), {
            lastMessage: messageContent,
            lastMessageAt: Timestamp.now(),
            unreadCount: data.fromMe ? 0 : 1,
            userName,
            userId,
            phoneNumber: fromPhone,
            isGroup: fromRaw.includes('@g.us')
        }, { merge: true });
    }

    // 3. Captura Respostas de Botão (Estrutura Baileys/api-wa.me)
    const isButtonResponse = eventType === 'buttons_response' || data.selectedButtonId || data.message?.buttonsResponseMessage;
    if (isButtonResponse) {
        const buttonId = data.selectedButtonId || data.id || data.message?.buttonsResponseMessage?.selectedButtonId;
        const buttonText = data.buttonText || data.text || data.message?.buttonsResponseMessage?.selectedDisplayText || buttonId;

        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: 'button',
            buttonId: buttonId || 'unknown',
            buttonText: buttonText || 'Botão clicado',
            receivedAt: Timestamp.now()
        });
    }

    // 4. Captura Respostas de Enquetes (Poll Updates)
    const isPollUpdate = eventType === 'poll_update' || data.pollUpdates || data.message?.pollUpdateMessage;
    if (isPollUpdate) {
        const pollName = data.pollName || data.message?.pollUpdateMessage?.name || 'Enquete';
        // As opções selecionadas costumam vir em um array de hashes ou strings
        const selectedOptions = data.selectedOptions || data.message?.pollUpdateMessage?.selectedOptions || [];

        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: 'poll',
            pollName,
            selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions],
            receivedAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro crítico no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
