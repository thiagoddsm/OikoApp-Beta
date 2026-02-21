
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

/**
 * API Route to send WhatsApp messages using direct fetch to api-wa.me
 * Supports text and interactive button messages.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, audience, message, userIds, targetNumber, type, buttons, footer, title } = body;

    if (!channel || (!message && type !== 'button') || (!audience && !targetNumber)) {
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

    for (const user of targetUsers) {
        const phone = user.phone.replace(/\D/g, '');
        const formattedPhone = phone.includes('@') ? phone : (phone.length <= 11 ? `55${phone}` : phone);
        
        const endpoint = type === 'button' ? 'message/button' : 'message/text';
        const url = `https://us.api-wa.me/${waKey}/${endpoint}`;
        
        const payload = type === 'button' ? {
            to: formattedPhone,
            title: (title || message).replace('{{nome}}', user.name),
            footer: footer || 'Igreja Batista da Manhã',
            buttons: buttons || []
        } : {
            to: formattedPhone,
            text: message.replace('{{nome}}', user.name)
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) sentCount++; else errorCount++;
        } catch (e) {
            errorCount++;
        }
    }

    await addDoc(collection(firestore, 'notifications_history'), {
        channel,
        message: type === 'button' ? `[BOTÕES] ${title || message}` : message,
        recipientCount: targetUsers.length,
        successCount: sentCount,
        status: errorCount === 0 ? 'success' : 'partial',
        sentAt: Timestamp.now()
    });

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
