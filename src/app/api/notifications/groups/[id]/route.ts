
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(serviceAccount) });
    } else {
        initializeApp();
    }
  } catch (e) {
    console.error('Firebase Admin initialization error', e);
  }
}

/**
 * GET /api/notifications/groups/detail?id=GROUP_ID&key=API_KEY&server=SERVER_URL
 *
 * Usa query param `id` em vez de path segment para evitar problemas
 * de encoding do caractere `@` no Next.js (ex: 120363@g.us).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let waKey: string | null = searchParams.get('key');
    let serverUrl = searchParams.get('server');
    let instanceName = searchParams.get('instance');
    const groupId = searchParams.get('id');

    if (!groupId) {
        return NextResponse.json({ error: 'Parâmetro id é obrigatório.' }, { status: 400 });
    }

    if (!waKey) {
      try {
          const db = getFirestore();
          const configSnap = await db.collection('config').doc('notifications').get();
          if (configSnap.exists) {
              const cfg = configSnap.data();
              waKey = waKey || cfg?.instanceKey || cfg?.whatsappApiKey || null;
              serverUrl = serverUrl || cfg?.serverUrl || 'https://api.ibmanha.com.br';
              instanceName = instanceName || cfg?.instanceName || 'IBM';
          }
      } catch (e: any) {
          console.warn('Falha ao ler config (Admin):', e.message);
      }
    }

    if (!waKey) {
        return NextResponse.json({ error: 'API Key não configurada.' }, { status: 400 });
    }

    const baseUrl = (serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
    const encodedId = encodeURIComponent(groupId);

    const response = await fetch(`${baseUrl}/group/findGroupInfos/${instanceName}?groupJid=${encodedId}`, {
        method: 'GET',
        headers: { 'accept': '*/*', 'apikey': waKey },
        cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        return NextResponse.json({
            error: data.message || `API retornou erro ${response.status}`
        }, { status: response.status });
    }

    // A API retorna { status, data: { ...groupInfo, participants: [...] }, message }
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
        joinApprovalMode: groupData.joinApprovalMode ?? false,
        memberAddMode: groupData.memberAddMode ?? false,
        ownerPhone: groupData.ownerPn?.replace('@s.whatsapp.net', '') || null,
        createdAt: groupData.creation ? new Date(groupData.creation * 1000).toISOString() : null,
        admins,
        participantCount: groupData.participants?.length ?? groupData.size ?? 0,
    });

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
  }
}
