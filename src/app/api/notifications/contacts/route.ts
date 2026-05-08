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

        // 2. BUSCA USUÁRIOS DO SISTEMA E RESOLVE JID/LID NA API
        // Esta é a parte mais importante: vinculamos o telefone do cadastro ao ID do WhatsApp
        const usersSnap = await db.collection('users').get();
        const systemUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let resolvedCount = 0;
        for (const user of systemUsers) {
            try {
                const rawPhone = (user as any).phone || (user as any).phoneNumber;
                if (!rawPhone) continue;
                
                // Força cast para string caso o valor no banco seja um número
                const phone = String(rawPhone).replace(/\D/g, '');
                if (phone.length < 8) continue;
                
                // Garante o formato brasileiro com ou sem 55
                const queryPhone = phone.startsWith('55') ? phone : `55${phone}`;

                const regRes = await fetch(`${baseUrl}/${apiKey}/actions/registered?number=${queryPhone}`);
                const regData = await regRes.json();
                
                const waInfo = regData["0"] || regData;
                if (waInfo && waInfo.exists) {
                    const contactRef = db.collection('notifications_contacts').doc(phone);
                    await contactRef.set({
                        phoneNumber: phone,
                        jid: waInfo.jid,
                        lid: waInfo.lid || null,
                        name: (user as any).name || null,
                        systemUserId: user.id,
                        updatedAt: new Date(),
                    }, { merge: true });
                    resolvedCount++;
                }
            } catch (e) {
                console.error(`Erro ao resolver usuário ${user.id}:`, e);
            }
            
            // Pausa curta para evitar rate limit na API
            if (resolvedCount > 0 && resolvedCount % 10 === 0) await new Promise(r => setTimeout(r, 500));
            if (resolvedCount >= 100) break; 
        }

        return NextResponse.json({ 
            success: true, 
            count, 
            resolvedCount,
            totalFetched: contacts.length,
            message: "Sincronização concluída com mapeamento de usuários do sistema."
        });
    } catch (error: any) {
        console.error('Sync Contacts Error:', error);
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
