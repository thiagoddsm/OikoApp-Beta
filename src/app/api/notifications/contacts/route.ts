import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let apiKey = searchParams.get('key');
        let serverUrl = searchParams.get('server');
        let instanceName = searchParams.get('instance');

        if (!apiKey || !serverUrl) {
            try {
                const db = getAdminDb();
                const configSnap = await db.collection('config').doc('notifications').get();
                if (configSnap.exists) {
                    const data = configSnap.data();
                    apiKey = apiKey || data?.evolutionKey || data?.instanceKey || data?.whatsappApiKey;
                    serverUrl = serverUrl || data?.evolutionUrl || data?.serverUrl || 'https://api.ibmanha.com.br';
                    instanceName = instanceName || data?.evolutionInstance || data?.instanceName || 'IBM';
                }
            } catch (e) {}
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'Chave da instância não fornecida.' }, { status: 400 });
        }

        const baseUrl = (serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
        const db = getAdminDb();
        let count = 0;

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

                const regRes = await fetch(`${baseUrl}/chat/whatsappNumbers/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ numbers: [queryPhone] })
                });
                
                const regData = await regRes.json();
                
                const waInfo = Array.isArray(regData) ? regData[0] : (regData["0"] || regData);
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

                    // Também atualizar o documento do usuário principal para acesso rápido
                    await db.collection('users').doc(user.id).update({
                        jid: waInfo.jid,
                        lid: waInfo.lid || null,
                        waSyncedAt: new Date()
                    });

                    resolvedCount++;
                }
            } catch (e) {
                console.error(`Erro ao resolver usuário ${user.id}:`, e);
            }
            
            // Pausa curta para evitar rate limit na API
            if (resolvedCount > 0 && resolvedCount % 5 === 0) await new Promise(r => setTimeout(r, 300));
            if (resolvedCount >= 200) break; 
        }

        return NextResponse.json({ 
            success: true, 
            resolvedCount,
            message: "Sincronização concluída com mapeamento de usuários do sistema."
        });
    } catch (error: any) {
        console.error('Sync Contacts Error:', error);
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
