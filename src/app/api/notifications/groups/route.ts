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

        // Resolve JIDs/LIDs directly from Firestore database (cache) or check WhatsApp database (Evolution API)
        const resolvedParticipants: string[] = [];
        for (const p of (participants || [])) {
            const clean = p.replace(/\D/g, '');
            if (clean.length > 15) {
                resolvedParticipants.push(`${clean}@lid`);
                continue;
            }
            const phoneNoCountry = clean.startsWith('55') ? clean.substring(2) : clean;
            const queryPhone = clean.startsWith('55') ? clean : `55${clean}`;
            
            try {
                // 1. Tenta buscar o contato no Firestore local (cache) para evitar sobrecarregar a API
                const contactDoc = await db.collection('notifications_contacts').doc(phoneNoCountry).get();
                if (contactDoc.exists) {
                    const cData = contactDoc.data();
                    const cachedId = cData?.lid || cData?.jid;
                    if (cachedId) {
                        resolvedParticipants.push(cachedId);
                        console.log(`[WhatsApp Group Create] Resolved participant ${clean} from FIRESTORE CACHE: ${cachedId}`);
                        continue;
                    }
                }
                
                // 2. Se não estiver no cache, consulta no endpoint da Evolution API
                const checkRes = await fetch(`${serverUrl}/chat/whatsappNumbers/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': waKey },
                    body: JSON.stringify({ numbers: [queryPhone] })
                });
                
                const checkData = await checkRes.json().catch(() => null);
                const info = Array.isArray(checkData) ? checkData[0] : (checkData ? checkData["0"] || checkData : null);
                
                if (info && info.exists) {
                    // Prioriza o LID se disponível, caindo para JID como segunda opção
                    const trueJid = info.lid || info.jid;
                    if (trueJid) {
                        resolvedParticipants.push(trueJid);
                        
                        // Grava no Firestore cache de contatos para as próximas execuções
                        await db.collection('notifications_contacts').doc(phoneNoCountry).set({
                            phoneNumber: phoneNoCountry,
                            jid: info.jid || null,
                            lid: info.lid || null,
                            updatedAt: new Date(),
                        }, { merge: true });
                        
                        console.log(`[WhatsApp Group Create] Resolved participant ${queryPhone} from EVOLUTION: ${trueJid} (Cached locally)`);
                        continue;
                    }
                }
            } catch (e: any) {
                console.warn(`[WhatsApp Group Create] Failed to resolve identity for ${queryPhone}:`, e.message);
            }
            
            // Fallback de segurança para número tradicional se nenhuma verificação retornar sucesso
            resolvedParticipants.push(`${queryPhone}@s.whatsapp.net`);
        }

        console.log(`[WhatsApp Group Create] Attempting to create "${groupName}" with verified participants:`, resolvedParticipants);

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
            
            // Check if it's a common Evolution instance status or configuration issue
            if (res.status === 400 && !detailError) {
                detailError = "Instância do WhatsApp desconectada (IBM) ou sem participantes válidos selecionados.";
            } else if (res.status === 403 || res.status === 401) {
                detailError = "Token de API do WhatsApp inválido ou expirado nas configurações.";
            }
            
            return NextResponse.json({ 
                success: false, 
                error: detailError || `Erro ${res.status} ao criar grupo no WhatsApp (Evolution API)` 
            }, { status: res.status });
        }

        // Evolution API returns JID on success. If JID is missing, we still accept the success status.
        const groupInfo = resData.data || resData;
        const groupJid = groupInfo.id || groupInfo.jid || groupInfo.key?.remoteJid || null;

        return NextResponse.json({ success: true, group: groupInfo, jid: groupJid });
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
                }
            } catch (e: any) {
                success = false;
                lastError = e.message;
            }
        }

        if (success && name !== undefined) {
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
                }
            } catch (e: any) {
                success = false;
                lastError = e.message;
            }
        }

        if (success && picture !== undefined) {
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

