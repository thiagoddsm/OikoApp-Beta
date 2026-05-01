import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * API Route to fetch WhatsApp contacts using api-wa.me
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let waKey: string | null = searchParams.get('key');
    let serverUrl = searchParams.get('server') || 'https://us.api-wa.me';

    // Se não vier por parâmetro, tenta buscar no Firestore Admin (fallback)
    if (!waKey) {
      try {
          const db = getAdminDb();
          const configSnap = await db.collection('config').doc('notifications').get();
          if (configSnap.exists) {
              const data = configSnap.data();
              waKey = data?.instanceKey || data?.whatsappApiKey || null;
              serverUrl = data?.serverUrl || serverUrl;
          }
      } catch (e: any) {
          console.warn('Falha ao ler config de notificações (Admin):', e.message);
      }
    }

    if (!waKey) {
        return NextResponse.json({ contacts: [], warning: 'API Key não configurada.' });
    }

    const baseUrl = serverUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/${waKey}/contacts`, {
        method: 'GET',
        headers: { 'accept': '*/*' },
        cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        return NextResponse.json({ 
            contacts: [],
            error: data.message || `API retornou erro ${response.status}`
        }, { status: response.status });
    }

    let rawContacts: any[] = [];
    if (Array.isArray(data)) {
        rawContacts = data;
    } else if (data.contacts && Array.isArray(data.contacts)) {
        rawContacts = data.contacts;
    } else if (data.data && Array.isArray(data.data)) {
        rawContacts = data.data;
    }

    const normalizedContacts = rawContacts
        .filter((c: any) => {
            const id = c.id || c.jid || '';
            return !id.includes('@g.us') && !id.includes('@broadcast') && (c.name || c.pushname || c.notify);
        })
        .map((c: any) => ({
            id: c.id || c.jid || '',
            name: c.name || c.pushname || c.notify || 'Sem Nome',
            phone: (c.id || c.jid || '').replace('@s.whatsapp.net', '').replace('@c.us', ''),
            profilePicture: c.profilePictureUrl || c.imgUrl || c.profilePicUrl || null,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'));

    return NextResponse.json({ contacts: normalizedContacts });

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}`, contacts: [] }, { status: 500 });
  }
}
