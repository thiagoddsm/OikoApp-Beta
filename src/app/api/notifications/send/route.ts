
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, doc, getDoc, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
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

    const { firestore } = initializeFirebase();
    
    // 1. Buscar a chave (prioridade para o que veio no body)
    let apiKey = bodyInstanceKey;
    let serverUrl = bodyServerUrl;

    if (!apiKey || !serverUrl) {
        const configRef = doc(firestore, 'config', 'notifications');
        try {
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
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
    if (targetNumber) {
        targetUsers.push({ id: 'custom', name: 'Destinatário Teste', phone: targetNumber.replace(/\D/g, '') });
    } else if (audience === 'specific_members' && userIds && userIds.length > 0) {
        // Buscar usuários específicos por ID
        const userPromises = userIds.map(id => getDoc(doc(firestore, 'users', id)));
        const userSnaps = await Promise.all(userPromises);
        
        userSnaps.forEach(snap => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.phone) {
                    targetUsers.push({ id: snap.id, name: data.name || 'Membro', phone: data.phone });
                }
            }
        });
    } else if (audience === 'all_members') {
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
    const { getWhatsAppClient, formatWhatsAppNumber } = await import('@/lib/whatsapp');
    const whatsapp = await getWhatsAppClient({ server: serverUrl, key: apiKey });

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of targetUsers) {
        const personalizedBody = (message || '').replace('{{nome}}', user.name);
        const formattedPhone = formatWhatsAppNumber(user.phone);
        
        // Preparar o body específico por tipo
        let messageBody: any = { to: formattedPhone };

        if (rest.type === 'button') {
            messageBody.text = personalizedBody || ' ';
            messageBody.title = rest.headerTitle || undefined;
            messageBody.footer = rest.footer || '';
            messageBody.buttons = rest.buttons || [];
        } else if (rest.type === 'survey') {
            messageBody.name = rest.surveyName || 'Enquete';
            messageBody.options = rest.options || [];
        } else if (rest.type === 'media' || rest.type === 'image') {
            messageBody.caption = personalizedBody || ' ';
            messageBody.url = rest.mediaUrl;
        } else {
            messageBody.text = personalizedBody;
        }

        try {
            const response = await whatsapp.sendMessage({
                type: rest.type || 'text',
                body: messageBody
            });

            if (response.status === 'success' || response.key || response.id) {
                sentCount++;
            } else {
                errorCount++;
                errors.push(`Falha para ${user.name}: ${JSON.stringify(response)}`);
            }
        } catch (e: any) { 
            errorCount++;
            errors.push(`Erro para ${user.name}: ${e.message}`);
        }
    }
    
    // Registrar histórico
    try {
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
    } catch (e) {
        console.warn("Falha ao registrar histórico de notificação:", e);
    }

    return NextResponse.json({ success: true, sentCount, errorCount, errors });

  } catch (error: any) {
    console.error("API Route Critical Error:", error.message);
    return NextResponse.json({ error: `Erro interno no servidor: ${error.message}` }, { status: 500 });
  }
}
