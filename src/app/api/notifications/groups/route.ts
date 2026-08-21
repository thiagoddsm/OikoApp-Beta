import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * API Route to manage WhatsApp Groups using api-wa.me / Evolution API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let waKey: string | null = searchParams.get('key');
    let serverUrl = searchParams.get('server');
    let instanceName = searchParams.get('instance');
    const groupId = searchParams.get('id');
    const getParticipantsParam = searchParams.get('getParticipants') === 'true';

    if (waKey === 'undefined' || waKey === 'null') waKey = null;
    if (serverUrl === 'undefined' || serverUrl === 'null') serverUrl = null;
    if (instanceName === 'undefined' || instanceName === 'null') instanceName = null;

    // Se não vier por parâmetro, tenta buscar no Firestore Admin (fallback)
    if (!waKey) {
      try {
          const db = getAdminDb();
          const configSnap = await db.collection('config').doc('notifications').get();
          if (configSnap.exists) {
              const data = configSnap.data();
               waKey = waKey || data?.evolutionKey || data?.instanceKey || data?.whatsappApiKey || null;
               serverUrl = serverUrl || data?.evolutionUrl || data?.serverUrl || 'https://api.ibmanha.com.br';
               instanceName = instanceName || data?.evolutionInstance || data?.instanceName || 'IBM';
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

    const baseUrl = (serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');

    // CASO 1: Buscar detalhe de um grupo específico
    if (groupId) {
        const detailUrl = `${baseUrl}/group/findGroupInfos/${instanceName}?groupJid=${encodeURIComponent(groupId)}`;
        
        const response = await fetch(detailUrl, {
            method: 'GET',
            headers: { 'accept': '*/*', 'apikey': waKey },
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

        // Busca o link / código de convite do grupo se não vier diretamente
        let inviteCode = groupData.inviteCode || groupData.code || '';
        let inviteUrl = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : '';
        if (!inviteUrl) {
            try {
                const inviteRes = await fetch(`${baseUrl}/group/inviteCode/${instanceName}?groupJid=${encodeURIComponent(groupId)}`, {
                    method: 'GET',
                    headers: { 'accept': '*/*', 'apikey': waKey },
                    cache: 'no-store',
                });
                if (inviteRes.ok) {
                    const inviteData = await inviteRes.json().catch(() => ({}));
                    const code = inviteData.code || inviteData.inviteCode || inviteData.data?.code || inviteData.data?.inviteCode;
                    if (code) {
                        inviteCode = code;
                        inviteUrl = `https://chat.whatsapp.com/${code}`;
                    }
                }
            } catch (e: any) {
                console.warn('Erro ao buscar inviteCode do grupo:', e?.message);
            }
        }

        return NextResponse.json({
            id: groupData.id,
            name: groupData.subject || 'Grupo sem Nome',
            description: groupData.desc || '',
            size: groupData.size || groupData.totalParticipants || (groupData.participants?.length ?? 0),
            restrict: groupData.restrict ?? false,
            announce: groupData.announce ?? false,
            isCommunity: groupData.isCommunity ?? false,
            isCommunityAnnounce: groupData.isCommunityAnnounce ?? false,
            inviteCode,
            inviteUrl,
            admins,
            createdAt: groupData.creation ? new Date(groupData.creation * 1000).toISOString() : null,
            participants: groupData.participants || []
        });
    }

    // CASO 2: Listar todos os grupos
    const apiUrl = `${baseUrl}/group/fetchAllGroups/${instanceName}?getParticipants=${getParticipantsParam ? 'true' : 'false'}`;
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'accept': '*/*', 'apikey': waKey },
        cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error(`[Groups GET Error] URL: ${apiUrl}, Status: ${response.status}, Data:`, data);
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
        participants: g.participants || []
    })).sort((a: any, b: any) => b.participantCount - a.participantCount);

    return NextResponse.json({ groups: normalizedGroups });

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}`, groups: [] }, { status: 500 });
  }
}

/**
 * POST /api/notifications/groups
 * Cria um novo grupo na Evolution API
 */
export async function POST(request: Request) {
    try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('notifications').get();
        const configData = configSnap.exists ? configSnap.data() : {};
        const waKey = configData?.evolutionKey || configData?.instanceKey || configData?.whatsappApiKey || null;
        const serverUrl = (configData?.evolutionUrl || configData?.serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
        const instanceName = configData?.evolutionInstance || configData?.instanceName || 'IBM';

        const { groupName, participants } = await request.json();

        if (!waKey) {
            return NextResponse.json({ success: false, error: 'API Key não configurada.' }, { status: 400 });
        }

        // Resolve JIDs/LIDs directly from Firestore database (cache) or clean phone format
        const resolvedParticipants: string[] = [];
        for (const p of (participants || [])) {
            if (!p || typeof p !== 'string') continue;

            if (p.includes('@')) {
                // Aceita apenas JIDs legítimos do WhatsApp
                if (/^\d+@(s\.whatsapp\.net|lid)$/.test(p.trim())) {
                    resolvedParticipants.push(p.trim());
                }
                continue;
            }
            const clean = p.replace(/\D/g, '');
            if (!clean || clean.length < 8) {
                console.warn(`[WhatsApp Group Create] Skipping invalid/empty participant number: "${p}"`);
                continue;
            }
            if (clean.length > 15) {
                resolvedParticipants.push(`${clean}@lid`);
                continue;
            }
            const phoneNoCountry = clean.startsWith('55') ? clean.substring(2) : clean;
            const queryPhone = clean.startsWith('55') ? clean : `55${clean}`;
            
            try {
                // Tenta buscar o contato no Firestore local (cache) para usar LID/JID se já conhecido e legítimo
                const contactDoc = await db.collection('notifications_contacts').doc(phoneNoCountry).get();
                if (contactDoc.exists) {
                    const cData = contactDoc.data();
                    const cachedLid = typeof cData?.lid === 'string' && /^\d+@lid$/.test(cData.lid) ? cData.lid : null;
                    const cachedJid = typeof cData?.jid === 'string' && /^\d+@s\.whatsapp\.net$/.test(cData.jid) ? cData.jid : null;
                    const cachedId = cachedLid || cachedJid;
                    if (cachedId) {
                        resolvedParticipants.push(cachedId);
                        continue;
                    }
                }
            } catch (e: any) {
                console.warn(`[WhatsApp Group Create] Cache lookup error for ${phoneNoCountry}:`, e?.message);
            }
            
            // Formato padrão seguro: 55... e @s.whatsapp.net
            resolvedParticipants.push(`${queryPhone}@s.whatsapp.net`);
        }

        console.log(`[WhatsApp Group Create] Attempting to create "${groupName}" with participants:`, resolvedParticipants);

        const res = await fetch(`${serverUrl}/group/create/${instanceName}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'apikey': waKey 
            },
            body: JSON.stringify({
                subject: groupName,
                participants: resolvedParticipants
            }),
        });

        const resData = await res.json().catch(() => ({}));
        
        if (!res.ok) {
            console.error("Evolution API Group Create Error Payload:", resData);
            let detailError = resData.message || (Array.isArray(resData.error) ? resData.error.join(', ') : resData.error) || null;
            
            if (res.status === 400 && !detailError) {
                detailError = "Instância do WhatsApp desconectada (IBM) ou sem participantes válidos selecionados.";
            } else if (res.status === 403 || res.status === 401) {
                detailError = "Token de API do WhatsApp inválido ou expirado nas configurações.";
            }
            
            return NextResponse.json({ 
                success: false, 
                error: detailError || `Erro ${res.status} ao criar grupo no WhatsApp (Evolution API)`,
                rawError: resData
            }, { status: res.status });
        }

        const groupInfo = resData.data || resData;
        const groupJid = groupInfo.id || groupInfo.jid || groupInfo.key?.remoteJid || null;

        // Tenta obter o inviteCode do grupo recém-criado
        let inviteCode = groupInfo.inviteCode || groupInfo.code || '';
        let inviteUrl = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : '';

        if (groupJid && !inviteUrl) {
            try {
                // Pequena pausa de 1s para o grupo registrar no Baileys antes de gerar o inviteCode
                await new Promise(r => setTimeout(r, 1000));
                const inviteRes = await fetch(`${serverUrl}/group/inviteCode/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`, {
                    method: 'GET',
                    headers: { 'accept': '*/*', 'apikey': waKey },
                    cache: 'no-store',
                });
                if (inviteRes.ok) {
                    const inviteData = await inviteRes.json().catch(() => ({}));
                    const code = inviteData.code || inviteData.inviteCode || inviteData.data?.code || inviteData.data?.inviteCode;
                    if (code) {
                        inviteCode = code;
                        inviteUrl = `https://chat.whatsapp.com/${code}`;
                    }
                }
            } catch (invErr: any) {
                console.warn('Erro ao obter inviteCode do novo grupo:', invErr?.message);
            }
        }

        return NextResponse.json({ 
            success: true, 
            group: groupInfo, 
            jid: groupJid, 
            inviteCode, 
            inviteUrl 
        });
    } catch (error: any) {
        console.error("Internal Server Error in Group POST route:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/notifications/groups
 * Atualiza nome, descrição ou foto do grupo
 */
export async function PUT(request: Request) {
    try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('notifications').get();
        const configData = configSnap.exists ? configSnap.data() : {};
        const waKey = configData?.evolutionKey || configData?.instanceKey || configData?.whatsappApiKey || null;
        const serverUrl = (configData?.evolutionUrl || configData?.serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
        const instanceName = configData?.evolutionInstance || configData?.instanceName || 'IBM';

        const { groupId, description, name, picture, action, participants } = await request.json();

        if (!waKey) {
            return NextResponse.json({ success: false, error: 'API Key não configurada.' }, { status: 400 });
        }

        let success = true;
        let lastError = '';

        let needDelay = false;

        if (description !== undefined) {
            try {
                const res = await fetch(`${serverUrl}/group/updateGroupDescription/${instanceName}?groupJid=${groupId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ description }),
                });
                if (!res.ok) {
                    success = false;
                    const errorData = await res.json().catch(() => ({}));
                    lastError = errorData.message || `Erro ${res.status} ao atualizar descrição`;
                } else {
                    needDelay = true;
                }
            } catch (e: any) {
                success = false;
                lastError = e.message;
            }
        }

        if (success && name !== undefined) {
            if (needDelay) {
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }
            try {
                const res = await fetch(`${serverUrl}/group/updateGroupSubject/${instanceName}?groupJid=${groupId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ subject: name }),
                });
                if (!res.ok) {
                    success = false;
                    const errorData = await res.json().catch(() => ({}));
                    lastError = errorData.message || `Erro ${res.status} ao atualizar nome`;
                } else {
                    needDelay = true;
                }
            } catch (e: any) {
                success = false;
                lastError = e.message;
            }
        }

        if (success && picture !== undefined) {
            if (needDelay) {
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }
            try {
                const res = await fetch(`${serverUrl}/group/updateGroupPicture/${instanceName}?groupJid=${groupId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ image: picture }),
                });
                if (!res.ok) {
                    success = false;
                    const errorData = await res.json().catch(() => ({}));
                    lastError = errorData.message || `Erro ${res.status} ao atualizar foto do grupo`;
                } else {
                    needDelay = true;
                }
            } catch (e: any) {
                success = false;
                lastError = e.message;
            }
        }

        if (success && action !== undefined && participants !== undefined) {
            try {
                const formattedParticipants = (participants || []).map((p: string) => {
                    if (p.includes('@')) return p;
                    const clean = p.replace(/\D/g, '');
                    if (clean.length > 15) {
                        return `${clean}@lid`;
                    }
                    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
                    return `${withCountry}@s.whatsapp.net`;
                });

                const res = await fetch(`${serverUrl}/group/updateParticipant/${instanceName}?groupJid=${groupId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ action, participants: formattedParticipants }),
                });
                if (!res.ok) {
                    success = false;
                    const errorData = await res.json().catch(() => ({}));
                    lastError = errorData.message || `Erro ${res.status} ao alterar participantes (${action})`;
                }
            } catch (e: any) {
                success = false;
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

