import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * API Route to manage WhatsApp Groups using api-wa.me
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let waKey: string | null = searchParams.get('key');
    let serverUrl = searchParams.get('server') || 'https://us.api-wa.me';
    const groupId = searchParams.get('id');

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
        return NextResponse.json({ 
            groups: [],
            warning: 'API Key não configurada.'
        });
    }

    const baseUrl = serverUrl.replace(/\/$/, '');

    // CASO 1: Buscar detalhe de um grupo específico
    if (groupId) {
        const encodedId = encodeURIComponent(groupId);
        const detailUrl = `${baseUrl}/${waKey}/groups/${encodedId}`;
        
        const response = await fetch(detailUrl, {
            method: 'GET',
            headers: { 'accept': '*/*' },
            cache: 'no-store',
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json({ error: data.message || `Erro ${response.status}` }, { status: response.status });
        }

        const groupData = data.data || data;
        const admins = (groupData.participants || [])
            .filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin')
            .map((p: any) => ({ id: p.id, role: p.admin }));

        return NextResponse.json({
            id: groupData.id,
            name: groupData.subject || 'Grupo sem Nome',
            description: groupData.desc || '',
            size: groupData.size || groupData.totalParticipants || (groupData.participants?.length ?? 0),
            restrict: groupData.restrict ?? false,
            announce: groupData.announce ?? false,
            isCommunity: groupData.isCommunity ?? false,
            isCommunityAnnounce: groupData.isCommunityAnnounce ?? false,
            admins,
            createdAt: groupData.creation ? new Date(groupData.creation * 1000).toISOString() : null,
        });
    }

    // CASO 2: Listar todos os grupos (comportamento original)
    const apiUrl = `${baseUrl}/${waKey}/groups`;
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'accept': '*/*' },
        cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        return NextResponse.json({ 
            groups: [],
            error: data.message || `API retornou erro ${response.status}`,
        }, { status: response.status });
    }

    // Extração robusta — a API retorna { status, groups: [...], message }
    let extractedGroups: any[] = [];
    if (Array.isArray(data)) {
        extractedGroups = data;
    } else if (data.groups && Array.isArray(data.groups)) {
        extractedGroups = data.groups;
    } else if (data.data && Array.isArray(data.data)) {
        extractedGroups = data.data;
    }

    const normalizedGroups = extractedGroups.map((g: any) => ({
        id: g.id || g.jid || '',
        name: g.subject || g.name || g.groupName || 'Grupo sem Nome',
        participantCount: g.totalParticipants || g.size || g.participants?.length || g.count || 0,
        description: g.desc || '',
    })).sort((a: any, b: any) => b.participantCount - a.participantCount);

    return NextResponse.json({ groups: normalizedGroups });

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}`, groups: [] }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('notifications').get();
        const configData = configSnap.exists ? configSnap.data() : {};
        const waKey = configData?.instanceKey || configData?.whatsappApiKey || null;
        const serverUrl = (configData?.serverUrl || 'https://us.api-wa.me').replace(/\/$/, '');

        const { groupId, description, name } = await request.json();

        if (!waKey) {
            return NextResponse.json({ success: false, error: 'API Key não configurada.' }, { status: 400 });
        }

        const endpoints = [
            { url: `${serverUrl}/${waKey}/groups/${groupId}/description`, method: 'POST', body: { description } },
            { url: `${serverUrl}/${waKey}/group/${groupId}/description`, method: 'POST', body: { description } },
            { url: `${serverUrl}/${waKey}/groups/${groupId}`, method: 'PUT', body: { subject: name, description } },
        ];

        let success = false;
        let lastError = '';
        for (const endpoint of endpoints) {
            if (success) break;
            try {
                const res = await fetch(endpoint.url, {
                    method: endpoint.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(endpoint.body),
                });
                if (res.ok) {
                    success = true;
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    lastError = errorData.message || `Erro ${res.status}`;
                }
            } catch (e: any) {
                lastError = e.message;
            }
        }

        if (!success) {
            return NextResponse.json({ success: false, error: lastError }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
