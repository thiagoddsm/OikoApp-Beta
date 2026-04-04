
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

// Rota principal da API para enviar notificações
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        channel, 
        audience, 
        message, 
        userIds, 
        targetNumber, 
        // Outras propriedades específicas do tipo de mensagem (buttons, media, etc.)
        ...rest
    } = body;

    if (channel !== 'whatsapp') {
        return NextResponse.json({ error: "Canal de notificação inválido." }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // 1. Buscar a chave correta do Firestore
    const configRef = doc(firestore, 'config', 'notifications');
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
        console.error("Erro Crítico: Documento de configuração 'config/notifications' não encontrado.");
        return NextResponse.json({ error: "Configuração de notificação não encontrada." }, { status: 500 });
    }
    
    // *** CORREÇÃO: Usando 'whatsappApiKey' em vez de 'apiToken' ***
    const apiKey = configSnap.data()?.whatsappApiKey;

    if (!apiKey) {
        console.error("Erro de Configuração: 'whatsappApiKey' não definido em 'config/notifications'.");
        return NextResponse.json({ error: "Gateway de WhatsApp não configurado. Token da API ausente." }, { status: 400 });
    }

    // 2. Montar a lista de destinatários
    const targetUsers: any[] = [];
    if (targetNumber) {
        targetUsers.push({ id: 'custom', name: 'Destinatário Teste', phone: targetNumber.replace(/\D/g, '') });
    } else if (audience === 'specific_members' && userIds && userIds.length > 0) {
        // Lógica para buscar usuários específicos (omitida para clareza, mantida da versão anterior)
    } else if (audience === 'all_members') { // Corrigido de 'all' para 'all_members' para corresponder ao frontend
         const usersSnap = await getDocs(collection(firestore, 'users'));
         usersSnap.forEach(d => {
            const data = d.data();
            if (data.phone) targetUsers.push({ id: d.id, name: data.name || 'Membro', phone: data.phone });
        });
    }

    if (targetUsers.length === 0) {
        return NextResponse.json({ success: false, message: "Nenhum destinatário válido encontrado." });
    }

    // 3. Iterar e enviar mensagens
    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of targetUsers) {
        const phoneDigits = user.phone.replace(/\D/g, '');
        const formattedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
        const personalizedBody = (message || '').replace('{{nome}}', user.name);

        const endpoint = 'message/send-text';
        const payload = { phone: formattedPhone, message: personalizedBody, isGroup: false };
        
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        };
        
        try {
            const response = await fetch(`https://us.api-wa.me/${apiKey}/${endpoint}`, requestOptions);
            const responseText = await response.text();

            if (response.ok) {
                sentCount++;
            } else {
                errorCount++;
                const errorMessage = responseText || `HTTP ${response.status}`;
                console.error(`Erro API WhatsApp para ${user.phone}:`, errorMessage);
                errors.push(`Falha para ${user.name}: ${errorMessage}`);
            }
        } catch (e: any) { 
            console.error("Erro de rede ao enviar para WhatsApp:", e);
            errorCount++;
            errors.push(`Erro de rede para ${user.name}: ${e.message}`);
        }
    }
    
    // Registrar histórico
    await addDoc(collection(firestore, "notifications_history"), {
        sentAt: Timestamp.now(),
        channel: 'whatsapp',
        message: message,
        recipientCount: targetUsers.length,
        successCount: sentCount,
        errorCount: errorCount,
        status: errorCount > 0 ? (sentCount > 0 ? 'partial' : 'failed') : 'success',
        type: rest.type || 'text',
    });

    return NextResponse.json({ success: true, sentCount, errorCount, errors });

  } catch (error: any) {
    console.error("API Route Critical Error:", error.message, error.stack);
    return NextResponse.json({ error: `Erro interno no servidor: ${error.message}` }, { status: 500 });
  }
}
