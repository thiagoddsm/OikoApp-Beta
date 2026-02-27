
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * API Route to send WhatsApp messages using direct fetch to api-wa.me
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
        surveyName,
        options,
        mediaUrl,
        fileName
    } = body;

    const { firestore } = initializeFirebase();
    
    let waKey = null;
    // Tenta ler a configuração. Se falhar, reporta o erro técnico real para debug.
    const configRef = doc(firestore, 'config', 'notifications');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
        waKey = configSnap.data()?.whatsappApiKey;
    }

    if (!waKey && channel === 'whatsapp') {
        return NextResponse.json({ error: "Gateway não configurado. Vá em Configurações e insira sua API Key." }, { status: 400 });
    }

    const targetUsers: any[] = [];

    if (targetNumber) {
        const phoneDigits = targetNumber.replace(/\D/g, '');
        targetUsers.push({ id: 'custom', name: 'Destinatário', phone: phoneDigits });
    } else if (audience === 'specific_members' && userIds) {
        const usersRef = collection(firestore, 'users');
        const chunks = [];
        for (let i = 0; i < userIds.length; i += 30) {
            chunks.push(userIds.slice(i, i + 30));
        }
        
        for (const chunk of chunks) {
            const q = query(usersRef, where('__name__', 'in', chunk));
            const snap = await getDocs(q);
            snap.forEach(d => {
                const data = d.data();
                if (data.phone) targetUsers.push({ id: d.id, name: data.name, phone: data.phone });
            });
        }
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
        const phoneDigits = user.phone.replace(/\D/g, '');
        const formattedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
        
        let endpoint = 'message/text';
        let payload: any = { to: formattedPhone };

        const personalizedBody = (message || '').replace('{{nome}}', user.name);

        switch (type) {
            case 'button':
                endpoint = 'message/button'; 
                payload = {
                    to: formattedPhone,
                    title: personalizedBody, 
                    footer: footer || 'Igreja Batista da Manhã',
                    buttons: (buttons || []).map((b: any) => ({
                        id: b.id,
                        text: b.text
                    }))
                };
                break;
            case 'survey':
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
            
            if (response.ok) {
                sentCount++;
                
                const displayContent = type === 'survey' ? `[ENQUETE] ${surveyName}` : (type === 'button' ? (payload.title || 'Botão') : (personalizedBody || 'Mídia'));

                // Salva mensagem no histórico do chat
                await addDoc(collection(firestore, 'notifications_messages'), {
                    from: phoneDigits,
                    fromMe: true,
                    userId: user.id,
                    userName: user.name,
                    content: displayContent,
                    type: type || 'text',
                    receivedAt: Timestamp.now()
                });

                // Atualiza o resumo do chat
                await setDoc(doc(firestore, 'notifications_chats', phoneDigits), {
                    lastMessage: displayContent,
                    lastMessageAt: Timestamp.now(),
                    unreadCount: 0,
                    userName: user.name,
                    userId: user.id,
                    phoneNumber: phoneDigits,
                    isGroup: false
                }, { merge: true });

            } else {
                const responseData = await response.json().catch(() => ({}));
                lastError = responseData.message || responseData.error || `Erro HTTP ${response.status}`;
                errorCount++;
            }
        } catch (e: any) {
            lastError = e.message;
            errorCount++;
        }
    }

    if (targetUsers.length > 0) {
        await addDoc(collection(firestore, 'notifications_history'), {
            channel,
            type: type || 'text',
            message: type === 'survey' ? `[ENQUETE] ${surveyName}` : (message || 'Mídia'),
            recipientCount: targetUsers.length,
            successCount: sentCount,
            status: errorCount === 0 ? 'success' : (sentCount > 0 ? 'partial' : 'failed'),
            lastError: lastError,
            sentAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    return NextResponse.json({ 
        error: `Falha técnica: ${error.message}`, 
        endpoint: currentEndpoint 
    }, { status: 500 });
  }
}
