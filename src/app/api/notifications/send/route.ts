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

        try {
            const response = await whatsapp.sendMessage({
                type: rest.type || 'text',
                body: messageBody
            });

            const isSuccess = response.status === 'success' || response.status === 200 || response.key || response.id || response.messageId || response.data?.id;
            if (isSuccess) {
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

    // Enviar para grupos do WhatsApp
    for (const groupId of targetGroups) {
        let messageBody: any = { to: groupId };

        if (rest.type === 'button') {
            messageBody.text = message || ' ';
            messageBody.title = rest.headerTitle || undefined;
            messageBody.footer = rest.footer || '';
            messageBody.buttons = rest.buttons || [];
        } else if (rest.type === 'survey') {
            messageBody.name = rest.surveyName || 'Enquete';
            messageBody.options = rest.options || [];
        } else if (rest.type === 'list') {
            messageBody.text = message || 'Escolha uma opção';
            messageBody.buttonText = rest.buttonText || 'Menu';
            messageBody.title = rest.headerTitle || 'Opções';
            messageBody.description = rest.description || '';
            messageBody.footer = rest.footer || '';
            messageBody.sections = rest.sections || [];
        } else if (rest.type === 'media' || rest.type === 'image') {
            messageBody.caption = message || ' ';
            messageBody.url = rest.mediaUrl;
        } else {
            messageBody.text = message || '';
        }

        try {
            const response = await whatsapp.sendMessage({ type: rest.type || 'text', body: messageBody });
            const isSuccess = response.status === 'success' || response.status === 200 || response.key || response.id || response.messageId || response.data?.id;
            if (isSuccess) {
                sentCount++;
            } else {
                errorCount++;
                errors.push(`Falha para grupo ${groupId}: ${JSON.stringify(response)}`);
            }
        } catch (e: any) {
            errorCount++;
            errors.push(`Erro para grupo ${groupId}: ${e.message}`);
        }
    }
    
    // Registrar histórico resumido
    try {
        const summary = message || (rest.surveyName ? `[Enquete] ${rest.surveyName}` : rest.type === 'media' ? '[Mídia]' : '[Mensagem]');
        await db.collection("notifications_history").add({
            sentAt: Timestamp.now(),
            channel: 'whatsapp',
            message: summary,
            recipientCount: targetUsers.length + targetGroups.length,
            successCount: sentCount,
            errorCount: errorCount,
            status: errorCount > 0 ? (sentCount > 0 ? 'partial' : 'failed') : 'success',
            type: rest.type || 'text',
            targetLabel: rest.audience || audience || 'custom',
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
