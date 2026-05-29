import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { refreshAccessToken, getFinancialEntries } from '@/lib/conta-azul';

export const runtime = 'nodejs';

/** Janela de renovação: renova o token se restar menos de 5 minutos */
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/** Quantos dias retroativos buscar nos lançamentos */
const SYNC_DAYS = 90;

export async function POST() {
  try {
    const db = getAdminDb();

    // 1. Ler token salvo no Firestore
    const integrationRef = db.collection('integrations').doc('contaAzul');
    const integrationSnap = await integrationRef.get();

    if (!integrationSnap.exists) {
      return NextResponse.json(
        { error: 'Integração Conta Azul não configurada. Conecte primeiro.' },
        { status: 400 }
      );
    }

    const integration = integrationSnap.data()!;
    let accessToken: string = integration.accessToken;
    let currentRefreshToken: string = integration.refreshToken;
    const expiresAtMs: number = integration.expiresAt?.toMillis?.() ?? 0;

    // 2. Renovar token se necessário
    if (Date.now() >= expiresAtMs - TOKEN_REFRESH_THRESHOLD_MS) {
      console.log('[Conta Azul] Token próximo do vencimento, renovando...');
      const renewed = await refreshAccessToken(currentRefreshToken);
      accessToken = renewed.accessToken;
      currentRefreshToken = renewed.refreshToken;

      await integrationRef.update({
        accessToken: renewed.accessToken,
        refreshToken: renewed.refreshToken,
        expiresAt: Timestamp.fromMillis(renewed.expiresAt),
      });
    }

    // 3. Calcular intervalo de datas (últimos 90 dias)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - SYNC_DAYS);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // 4. Buscar lançamentos (com paginação simples)
    let page = 0;
    let allEntries: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const entries = await getFinancialEntries(accessToken, {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        page,
      });

      if (entries.length === 0) {
        hasMore = false;
      } else {
        allEntries = allEntries.concat(entries);
        page++;
        // Evitar loop infinito — limitar a 20 páginas
        if (page >= 20) hasMore = false;
      }
    }

    // 5. Persistir cada lançamento no Firestore
    const batch = db.batch();
    const now = Timestamp.now();
    let count = 0;

    for (const entry of allEntries) {
      if (!entry.id) continue;

      const docRef = db.collection('contaAzulEntries').doc(String(entry.id));
      batch.set(docRef, {
        externalId: entry.id,
        type: entry.type ?? '',
        description: entry.description ?? '',
        amount: entry.amount ?? 0,
        dueDate: entry.dueDate ?? '',
        status: entry.status ?? '',
        category: entry.category ?? '',
        contactName: entry.contactName ?? '',
        paymentDate: entry.paymentDate ?? null,
        syncedAt: now,
      });

      count++;

      // Firestore batch limit é 500 operações
      if (count % 400 === 0) {
        await batch.commit();
      }
    }

    // Commit do batch restante
    if (count % 400 !== 0 || count === 0) {
      await batch.commit();
    }

    // 6. Atualizar lastSyncAt na integração
    const lastSyncAt = Timestamp.now();
    await integrationRef.update({ lastSyncAt });

    return NextResponse.json({
      synced: count,
      lastSyncAt: lastSyncAt.toDate().toISOString(),
    });
  } catch (error: any) {
    console.error('[Conta Azul] Erro na sincronização:', error.message);
    return NextResponse.json(
      { error: `Erro na sincronização: ${error.message}` },
      { status: 500 }
    );
  }
}