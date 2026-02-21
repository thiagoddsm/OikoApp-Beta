
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

/**
 * API Route to send WhatsApp messages using direct fetch to api-wa.me
 * Supports: text, title (structured), button (interactive), survey, image, document
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        channel, 
        audience, 
        message, 
        userIds, 
        targetNumber, 
        type, 
        buttons, 
        footer, 
        title,
        surveyName,
        options,
        mediaUrl,
        fileName
    } = body;

    if (!channel || (!audience && !targetNumber)) {
      return NextResponse.json({ error: 'Parâmetros insuficientes para o envio.' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    let waKey = null;
    try {
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            waKey = configSnap.data()?.whatsappApiKey;
        }
    } catch (e: any) {
        return NextResponse.json({ error: `Erro de permissão ao ler banco de dados.` }, { status: 500 });
    }

    if (!waKey && channel === 'whatsapp') {
        return NextResponse.json({ error: "API Key não configurada." }, { status: 400 });
    }

    const targetUsers: any[] = [];

    if (targetNumber) {
        targetUsers.push({ id: 'custom', name: 'Destinatário', phone: targetNumber });
    } else if (audience === 'specific_members' && userIds) {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('__name__', 'in', userIds.slice(0, 30)));
        const snap = await getDocs(q);
        snap.forEach(d => {
            const data = d.data();
            if (data.phone) targetUsers.push({ id: d.id, name: data.name, phone: data.phone });
        });
    } else {
        const usersRef = collection(firestore, 'users');
        const snap = await getDocs(query(usersRef));
        snap.forEach(d => {
            const data = d.data();
            if (data.phone) targetUsers.push({ id: d.id, name: data.name, phone: data.phone });
        });
    }

    let sentCount = 0;
    let errorCount = 0;
    let lastError = '';

    for (const user of targetUsers) {
        const phone = user.phone.replace(/\D/g, '');
        const formattedPhone = phone.includes('@') ? phone : (phone.length <= 11 ? `55${phone}` : phone);
        
        let endpoint = 'message/text';
        let payload: any = { to: formattedPhone };

        switch (type) {
            case 'button':
                // Using 'message/button_reply' as per v5.0 engagement documentation
                endpoint = 'message/button_reply';
                payload = {
                    ...payload,
                    title: title || 'Informativo IBM',
                    body: (message || '').replace('{{nome}}', user.name),
                    footer: footer || 'Igreja Batista da Manhã',
                    buttons: buttons || []
                };
                break;
            case 'survey':
                endpoint = 'message/survey';
                payload = {
                    ...payload,
                    name: (surveyName || 'Enquete IBM').replace('{{nome}}', user.name),
                    options: options || [],
                    selectableOptionsCount: 1
                };
                break;
            case 'media':
                const isImage = mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i);
                endpoint = isImage ? 'message/image' : 'message/document';
                payload = {
                    ...payload,
                    url: mediaUrl,
                    caption: (message || '').replace('{{nome}}', user.name),
                    fileName: fileName || 'documento'
                };
                break;
            default:
                endpoint = 'message/text';
                payload = {
                    ...payload,
                    text: (message || '').replace('{{nome}}', user.name)
                };
        }

        const url = `https://us.api-wa.me/${waKey}/${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                sentCount++;
            } else {
                const errData = await response.json().catch(() => ({}));
                lastError = errData.message || errData.error || `Erro ${response.status}`;
                errorCount++;
            }
        } catch (e: any) {
            lastError = e.message;
            errorCount++;
        }
    }

    await addDoc(collection(firestore, 'notifications_history'), {
        channel,
        type: type || 'text',
        message: type === 'survey' ? `[ENQUETE] ${surveyName}` : (message || title || 'Mídia'),
        recipientCount: targetUsers.length,
        successCount: sentCount,
        status: errorCount === 0 ? 'success' : (sentCount > 0 ? 'partial' : 'failed'),
        lastError: lastError,
        sentAt: Timestamp.now()
    });

    if (sentCount === 0 && targetUsers.length > 0) {
        return NextResponse.json({ error: lastError || 'Falha ao enviar mensagens.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
