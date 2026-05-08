import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const apiKey = searchParams.get('key');
        const serverUrl = searchParams.get('server') || 'https://us.api-wa.me';

        if (!apiKey) {
            return NextResponse.json({ error: 'Chave da instância não fornecida.' }, { status: 400 });
        }

        const baseUrl = serverUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/${apiKey}/contacts`, {
            method: 'GET',
            headers: { 'accept': '*/*' },
        });

        const data = await response.json();
        
        if (data.status !== 200) {
            return NextResponse.json({ error: data.message || 'Erro ao buscar contatos' }, { status: data.status || 500 });
        }

        const contacts = data.contacts || [];
        const db = getAdminDb();
        const batch = db.batch();
        let count = 0;

        for (const contact of contacts) {
            if (!contact.id) continue;
            
            const jid = contact.id;
            const lid = contact.lid || null;
            const phone = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
            
            // Se não tiver telefone e for LID, usamos o ID do LID como chave de documento se necessário, 
            // mas idealmente usamos o telefone como chave principal e salvamos o LID dentro.
            const docId = phone || jid.split('@')[0];
            if (!docId) continue;

            const contactRef = db.collection('notifications_contacts').doc(docId);
            batch.set(contactRef, {
                phoneNumber: phone || null,
                jid: jid,
                lid: lid,
                name: contact.name || contact.notify || contact.verifiedName || null,
                pushName: contact.notify || contact.name || null,
                updatedAt: new Date(),
            }, { merge: true });
            
            count++;
            if (count >= 400) break; // Limite de segurança para o batch do Firestore (500 é o max)
        }

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, count, totalFetched: contacts.length });
    } catch (error: any) {
        console.error('Sync Contacts Error:', error);
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
