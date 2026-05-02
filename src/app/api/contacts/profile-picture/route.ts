import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * GET /api/contacts/profile-picture?phone=5521999999999&userId=xxx&save=true&proxy=true
 *
 * Busca a foto de perfil do WhatsApp de um contato.
 * - `save=true` + `userId`: salva a URL da foto no perfil do usuário no Firestore.
 * - `proxy=true`: em vez de retornar a URL, faz proxy dos bytes da imagem diretamente.
 *   Necessário porque pps.whatsapp.net bloqueia carregamento direto pelo browser (hotlink).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone')?.replace(/\D/g, '');
        const userId = searchParams.get('userId');
        const save = searchParams.get('save') === 'true';
        const proxy = searchParams.get('proxy') === 'true';

        if (!phone) {
            return NextResponse.json({ error: 'Número de telefone ausente.' }, { status: 400 });
        }

        // Buscar configurações do gateway WhatsApp
        const db = getAdminDb();
        let apiKey: string | undefined;
        let serverUrl = 'https://us.api-wa.me';

        try {
            const configSnap = await db.collection('config').doc('notifications').get();
            if (configSnap.exists) {
                const cfg = configSnap.data();
                apiKey = cfg?.instanceKey || cfg?.whatsappApiKey;
                serverUrl = cfg?.serverUrl || serverUrl;
            }
        } catch (e: any) {
            return NextResponse.json(
                { error: `Erro ao ler configurações do gateway: ${e.message}` },
                { status: 403 }
            );
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Gateway de WhatsApp não configurado. Token da API ausente.' },
                { status: 400 }
            );
        }

        const base = serverUrl.replace(/\/$/, '');
        const url = `${base}/${apiKey}/contacts/${phone}`;

        const waResponse = await fetch(url, { headers: { accept: '*/*' } });

        if (!waResponse.ok) {
            const text = await waResponse.text();
            return NextResponse.json(
                { error: `Erro na API do WhatsApp (${waResponse.status}): ${text}` },
                { status: waResponse.status }
            );
        }

        const data = await waResponse.json();
        const imageUrl: string | undefined = data?.profile?.image;

        // Se solicitado, persistir a URL no perfil do usuário
        if (save && userId && imageUrl) {
            try {
                await db.collection('users').doc(userId).update({
                    profilePicture: imageUrl,
                    profilePictureUpdatedAt: new Date().toISOString(),
                });
            } catch (e: any) {
                console.warn(`[profile-picture] Falha ao salvar foto para ${userId}:`, e.message);
            }
        }

        // Modo proxy: busca os bytes da imagem server-side e retorna direto
        // Necessário porque pps.whatsapp.net bloqueia hotlink do browser
        if (proxy && imageUrl) {
            try {
                const imgRes = await fetch(imageUrl, {
                    headers: {
                        'User-Agent': 'WhatsApp/2.23.24.82 A',
                        'Referer': 'https://web.whatsapp.com/',
                    },
                });

                if (imgRes.ok) {
                    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                    const buffer = await imgRes.arrayBuffer();
                    return new Response(buffer, {
                        status: 200,
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
                        },
                    });
                }
            } catch (e: any) {
                console.warn('[profile-picture] Falha ao fazer proxy da imagem:', e.message);
            }
            return new Response(null, { status: 404 });
        }

        return NextResponse.json({
            phone,
            imageUrl: imageUrl || null,
            isBusiness: data?.isBusiness ?? false,
            saved: !!(save && userId && imageUrl),
        });
    } catch (error: any) {
        console.error('[profile-picture] Erro crítico:', error.message);
        return NextResponse.json(
            { error: `Erro interno: ${error.message}` },
            { status: 500 }
        );
    }
}
