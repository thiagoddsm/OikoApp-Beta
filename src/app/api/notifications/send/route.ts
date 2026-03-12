import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, doc, getDoc, getDocs } from 'firebase/firestore';

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
        default: return 'application/octet-stream';
    }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        channel, audience, message, userIds, targetNumber, 
        type, buttons, footer, surveyName, options, mediaUrl, headerTitle
    } = body;

    const { firestore } = initializeFirebase();
    
    // Buscar chave da API com log de erro detalhado
    const configRef = doc(firestore, 'config', 'notifications');
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
        return NextResponse.json({ error: "Configuração não encontrada no Firestore" }, { status: 404 });
    }
    
    const waKey = configSnap.data()?.whatsappApiKey;
    if (!waKey && channel === 'whatsapp') {
        return NextResponse.json({ error: "Gateway não configurado." }, { status: 400 });
    }

    // Buscar usuários
    const targetUsers: any[] = [];
    if (targetNumber) {
        targetUsers.push({ id: 'custom', name: 'Destinatário', phone: targetNumber.replace(/\D/g, '') });
    } else if (audience === 'specific_members' && userIds) {
        for (const uid of userIds) {
            const userSnap = await getDoc(doc(firestore, 'users', uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.phone) targetUsers.push({ id: uid, name: data.name, phone: data.phone });
            }
        }
    } else {
        const usersSnap = await getDocs(collection(firestore, 'users'));
        usersSnap.forEach(d => {
            const data = d.data();
            if (data.phone) targetUsers.push({ id: d.id, name: data.name, phone: data.phone });
        });
    }

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of targetUsers) {
        const phoneDigits = user.phone.replace(/\D/g, '');
        const formattedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
        
        let endpoint = 'message/text';
        let payload: any = { to: formattedPhone };
        const personalizedBody = (message || '').replace('{{nome}}', user.name);

        switch (type) {
            case 'button':
                endpoint = 'message/button_reply';
                payload = { 
                    to: formattedPhone, 
                    header: { title: headerTitle || 'Informativo IBM', hasMediaAttachment: false }, 
                    text: personalizedBody, 
                    footer: footer || 'Igreja Batista da Manhã', 
                    buttons: (buttons || []).map((b: any) => ({ type: 'quick_reply', id: b.id, text: b.text })) 
                };
                break;
            case 'survey':
                endpoint = 'message/survey';
                payload = { to: formattedPhone, name: (surveyName || 'Enquete IBM').replace('{{nome}}', user.name), options: options || [] };
                break;
            case 'media':
                if (!mediaUrl) break;
                const mime = getMimetype(mediaUrl);
                endpoint = mime.startsWith('image/') ? 'message/image' : mime.startsWith('video/') ? 'message/video' : 'message/document';
                payload = { to: formattedPhone, url: mediaUrl, caption: personalizedBody, mimetype: mime, fileName: 'arquivo' };
                break;
            default:
                payload = { to: formattedPhone, text: personalizedBody };
        }

        try {
            const response = await fetch(`https://us.api-wa.me/${waKey}/${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'OikoApp-IBM-Server'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                sentCount++;
                const displayContent = type === 'survey' ? `[ENQUETE] ${surveyName}` : (type === 'button' ? personalizedBody : (personalizedBody || 'Mídia'));
                
                await addDoc(collection(firestore, 'notifications_messages'), {
                    from: phoneDigits, fromMe: true, userId: user.id, userName: user.name,
                    content: displayContent, type: type || 'text', receivedAt: Timestamp.now()
                });
                await setDoc(doc(firestore, 'notifications_chats', phoneDigits), {
                    lastMessage: displayContent, lastMessageAt: Timestamp.now(), unreadCount: 0,
                    userName: user.name, userId: user.id, phoneNumber: phoneDigits, isGroup: false
                }, { merge: true });
            } else {
                const err = await response.text();
                console.error(`Erro API WhatsApp para ${user.phone}: ${err}`);
                errorCount++;
                errors.push(`Falha no envio para ${user.name}: ${err}`);
            }
        } catch (e: any) { 
            console.error("Erro de rede ao enviar para WhatsApp:", e);
            errorCount++;
            errors.push(`Erro de rede para ${user.name}: ${e.message}`);
        }
    }

    if (targetUsers.length > 0) {
        await addDoc(collection(firestore, 'notifications_history'), {
            channel, type: type || 'text',
            message: type === 'survey' ? `[ENQUETE] ${surveyName}` : (message || 'Mídia'),
            recipientCount: targetUsers.length, successCount: sentCount,
            status: errorCount === 0 ? 'success' : (sentCount > 0 ? 'partial' : 'failed'),
            errors: errors.slice(0, 5),
            sentAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true, sentCount, errorCount, errors });
  } catch (error: any) {
    console.error("API Route Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
