import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * DELETE /api/notifications/cleanup?broadcastId=xxx
 * Deleta todas as respostas (notifications_responses) vinculadas a um broadcastId específico.
 * 
 * DELETE /api/notifications/cleanup?type=all_responses
 * Deleta TODAS as respostas de notifications_responses.
 * 
 * DELETE /api/notifications/cleanup?type=orphan_responses
 * Deleta respostas sem broadcastId (órfãs).
 */
export async function DELETE(request: Request) {
  try {
    const db = getAdminDb();
    const url = new URL(request.url);
    const broadcastId = url.searchParams.get('broadcastId');
    const type = url.searchParams.get('type');

    let deletedCount = 0;

    if (broadcastId) {
      // Deletar respostas de uma campanha específica
      const snap = await db.collection('notifications_responses')
        .where('broadcastId', '==', broadcastId)
        .get();

      if (!snap.empty) {
        const chunks = [];
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          chunks.push(docs.slice(i, i + 400));
        }
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        deletedCount = docs.length;
      }

      // Também deletar respostas órfãs (broadcastId == null) que podem pertencer a esta campanha
      // Buscar os destinatários desta campanha
      const sentSnap = await db.collection('notifications_sent_messages')
        .where('broadcastId', '==', broadcastId)
        .get();
      
      if (!sentSnap.empty) {
        const recipients = new Set(sentSnap.docs.map(d => d.data().recipient));
        
        // Buscar respostas órfãs desses destinatários
        const orphanSnap = await db.collection('notifications_responses')
          .where('broadcastId', '==', null)
          .get();
        
        const toDelete = orphanSnap.docs.filter(d => {
          const from = String(d.data().from || '').replace(/\D/g, '');
          return recipients.has(from) || [...recipients].some(r => 
            r.endsWith(from.slice(-8)) || from.endsWith(r.slice(-8))
          );
        });

        if (toDelete.length > 0) {
          const chunks = [];
          for (let i = 0; i < toDelete.length; i += 400) {
            chunks.push(toDelete.slice(i, i + 400));
          }
          for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
          deletedCount += toDelete.length;
        }
      }

    } else if (type === 'all_responses') {
      // Deletar TODAS as respostas
      let hasMore = true;
      while (hasMore) {
        const snap = await db.collection('notifications_responses').limit(400).get();
        if (snap.empty) {
          hasMore = false;
          break;
        }
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deletedCount += snap.docs.length;
      }

    } else if (type === 'orphan_responses') {
      // Deletar respostas sem broadcastId
      const snap = await db.collection('notifications_responses')
        .where('broadcastId', '==', null)
        .get();
      
      if (!snap.empty) {
        const chunks = [];
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          chunks.push(docs.slice(i, i + 400));
        }
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        deletedCount = docs.length;
      }

    } else if (type === 'logs') {
      // Limpar logs de debug
      let hasMore = true;
      while (hasMore) {
        const snap = await db.collection('notifications_logs').limit(400).get();
        if (snap.empty) {
          hasMore = false;
          break;
        }
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deletedCount += snap.docs.length;
      }

    } else {
      return NextResponse.json({ error: 'Parâmetro obrigatório: broadcastId ou type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error: any) {
    console.error('Cleanup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
