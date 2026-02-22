
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

/**
 * API Route to send WhatsApp messages using direct fetch to api-wa.me
 * Optimized for v5.0.0 Pro Plan Features (Buttons, Surveys, Media)
 */

const getMimetype = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'pdf': return 'application/pdf';
        case 'mp4': return 'video/mp4';
        case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls': return 'application/vnd.ms-excel';
        case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        default: return 'application/octet-stream';
    }
};

export async function POST(request: Request) {
  let currentEndpoint = 'message/text';
  
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
        fileName,
        pixKey,
        pixName,
        pixCity,
        pixAmount
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
        return NextResponse.json({ error: "API Key não configurada no sistema." }, { status: 400 });
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
    let rawError = null;

    for (const user of targetUsers) {
        const phone = user.phone.replace(/\D/g, '');
        const formattedPhone = phone.includes('@') ? phone : (phone.length <= 11 ? `55${phone}` : phone);
        
        let endpoint = 'message/text';
        let payload: any = { to: formattedPhone };

        const personalizedBody = (message || '').replace('{{nome}}', user.name);

        switch (type) {
            case 'button':
                // v5.0.0 Pro: message/button_reply
                // Schema requires 'header' and 'text' properties
                endpoint = 'message/button_reply';
                payload = {
                    to: formattedPhone,
                    header: (title || 'Informativo IBM').replace('{{nome}}', user.name),
                    text: personalizedBody || 'Clique em uma das opções abaixo:',
                    footer: footer || 'Igreja Batista da Manhã',
                    buttons: (buttons || []).map((b: any) => ({
                        id: b.id,
                        text: b.text
                    }))
                };
                break;
            case 'survey':
                // v5.0.0 Pro: message/survey
                endpoint = 'message/survey';
                payload = {
                    to: formattedPhone,
                    name: (surveyName || 'Enquete IBM').replace('{{nome}}', user.name),
                    options: options || []
                };
                break;
            case 'media':
                if (!mediaUrl) break;
                const mime = getMimetype(mediaUrl);
                const isImage = mime.startsWith('image/');
                const isVideo = mime.startsWith('video/');
                const isAudio = mime.startsWith('audio/');
                
                endpoint = isImage ? 'message/image' : isVideo ? 'message/video' : isAudio ? 'message/audio' : 'message/document';
                payload = {
                    to: formattedPhone,
                    url: mediaUrl,
                    mimetype: mime,
                    caption: personalizedBody,
                    fileName: fileName || 'arquivo'
                };
                break;
            case 'pix':
                // v5.0.0 Enterprise: message/pix
                endpoint = 'message/pix';
                payload = {
                    to: formattedPhone,
                    key: pixKey,
                    name: pixName || 'Igreja Batista da Manhã',
                    city: pixCity || 'Sao Goncalo',
                    amount: Number(pixAmount) || 0,
                    body: personalizedBody
                };
                break;
            default:
                endpoint = 'message/text';
                payload = {
                    to: formattedPhone,
                    text: personalizedBody
                };
        }

        currentEndpoint = endpoint;
        const url = `https://us.api-wa.me/${waKey}/${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const responseData = await response.json().catch(() => ({}));

            if (response.ok) {
                sentCount++;
            } else {
                rawError = responseData;
                lastError = responseData.message || responseData.error || `Erro HTTP ${response.status}`;
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
        return NextResponse.json({ 
            error: lastError || 'Falha ao enviar mensagens.',
            details: rawError,
            endpoint: currentEndpoint 
        }, { status: 500 });
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    return NextResponse.json({ 
        error: error.message, 
        endpoint: currentEndpoint 
    }, { status: 500 });
  }
}
