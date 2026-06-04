/**
 * migrate-timeline.ts
 * Script de migração retroativa: percorre todos os membros e gera eventos
 * históricos na linha do tempo com base nos dados já existentes.
 *
 * ATENÇÃO: Este script usa o Firebase Admin SDK.
 * Execute com: npx ts-node -P tsconfig.server.json scripts/migrate-timeline.ts
 *
 * É IDEMPOTENTE: verifica source='migrated' para não duplicar eventos.
 */

import * as admin from 'firebase-admin';
import * as serviceAccount from '../serviceAccountKey.json';

// ─── Inicialização ──────────────────────────────────────────────────────────

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const db = admin.firestore();

// ─── Tipos ────────────────────────────────────────────────────────────────────

const INTEGRATION_STATUS_TO_EVENT: Record<string, { description: string; badge: string }> = {
  nao_alcancado: { description: 'CADASTRADO COMO VISITANTE', badge: 'VISITANTE' },
  novo_convertido: { description: 'DECISÃO POR CRISTO', badge: 'NÃO MEMBRO' },
  reconciliado: { description: 'RECONCILIAÇÃO', badge: 'NÃO MEMBRO' },
  transferido: { description: 'TRANSFERIDO DE OUTRA IGREJA', badge: 'PARTICIPANTE' },
  membro: { description: 'ADMISSÃO POR BATISMO / ARROLAMENTO', badge: 'MEMBRO' },
  consolidado: { description: 'CONSOLIDADO NA FÉ', badge: 'MEMBRO' },
  lider_treinamento: { description: 'INICIOU TREINAMENTO DE LIDERANÇA', badge: 'EM FORMAÇÃO' },
  lider_gc: { description: 'NOMEADO LÍDER DE GC', badge: 'LÍDER GC' },
  lider_area: { description: 'NOMEADO LÍDER DE ÁREA', badge: 'LÍDER ÁREA' },
  lider_rede: { description: 'NOMEADO LÍDER DE REDE', badge: 'LÍDER REDE' },
  pastor: { description: 'ORDENADO / NOMEADO PASTOR', badge: 'PASTOR' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hasExistingMigratedEvent(
  userId: string,
  category: string,
  eventDescription: string
): Promise<boolean> {
  const q = await db
    .collection(`users/${userId}/notes`)
    .where('source', '==', 'migrated')
    .where('category', '==', category)
    .where('eventDescription', '==', eventDescription)
    .limit(1)
    .get();
  return !q.empty;
}

async function addMigratedEvent(
  userId: string,
  payload: {
    category: string;
    entityTitle: string;
    eventDescription: string;
    statusBadge?: string;
    eventDate: admin.firestore.Timestamp;
    relatedId?: string;
    content?: string;
  }
) {
  // Checar idempotência
  const exists = await hasExistingMigratedEvent(userId, payload.category, payload.eventDescription);
  if (exists) return 0;

  await db.collection(`users/${userId}/notes`).add({
    type: 'system',
    content: payload.content ?? '',
    authorId: 'migration_script',
    createdAt: admin.firestore.Timestamp.now(),
    source: 'migrated',
    ...payload,
  });
  return 1;
}

// ─── Migração Principal ───────────────────────────────────────────────────────

async function migrate() {
  console.log('🚀 Iniciando migração da Linha do Tempo...\n');

  const usersSnap = await db.collection('users').get();
  console.log(`📋 Total de membros: ${usersSnap.size}`);

  let totalEvents = 0;
  let processedUsers = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const userId = userDoc.id;
    let eventsForUser = 0;

    // ── 1. Evento de Origem (createdAt) ──────────────────────────────────────
    if (data.createdAt) {
      const comoConheceu = data.comoConheceu ?? 'Cadastro Manual';
      eventsForUser += await addMigratedEvent(userId, {
        category: 'origin',
        entityTitle: 'ORIGEM DO CADASTRO',
        eventDescription: comoConheceu.toUpperCase(),
        eventDate: data.createdAt,
      });
    }

    // ── 2. Status Eclesiástico atual ─────────────────────────────────────────
    const status = data.integrationStatus;
    if (status && INTEGRATION_STATUS_TO_EVENT[status]) {
      const evt = INTEGRATION_STATUS_TO_EVENT[status];
      const dateToUse = data.updatedAt ?? data.createdAt ?? admin.firestore.Timestamp.now();
      eventsForUser += await addMigratedEvent(userId, {
        category: 'ecclesiastical_status',
        entityTitle: evt.description,
        eventDescription: evt.description,
        statusBadge: evt.badge,
        eventDate: dateToUse,
      });
    }

    // ── 3. Célula atual ───────────────────────────────────────────────────────
    const celulaId = data.hierarchy?.celulaId;
    if (celulaId) {
      // Buscar nome da célula
      let cellName = 'GC';
      try {
        const cellDoc = await db.collection('cells').doc(celulaId).get();
        if (cellDoc.exists) cellName = cellDoc.data()?.nome ?? 'GC';
      } catch (_) {}

      const dateToUse = data.updatedAt ?? data.createdAt ?? admin.firestore.Timestamp.now();
      eventsForUser += await addMigratedEvent(userId, {
        category: 'gc',
        entityTitle: cellName.toUpperCase(),
        eventDescription: 'MEMBRO DO GC',
        relatedId: celulaId,
        eventDate: dateToUse,
      });
    }

    // ── 4. Cursos aprovados ────────────────────────────────────────────────────
    const courseStatus: Record<string, string> = data.journey?.courseStatus ?? {};
    for (const [courseId, status] of Object.entries(courseStatus)) {
      if (status !== 'approved') continue;

      // Buscar nome do curso
      let courseName = courseId;
      try {
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (courseDoc.exists) courseName = courseDoc.data()?.name ?? courseId;
      } catch (_) {}

      const dateToUse = data.updatedAt ?? data.createdAt ?? admin.firestore.Timestamp.now();
      eventsForUser += await addMigratedEvent(userId, {
        category: 'teaching',
        entityTitle: courseName.toUpperCase(),
        eventDescription: 'APROVADO',
        statusBadge: 'APROVADO',
        relatedId: courseId,
        eventDate: dateToUse,
      });
    }

    if (eventsForUser > 0) {
      console.log(`  ✅ ${data.name ?? userId}: ${eventsForUser} evento(s) criado(s)`);
      totalEvents += eventsForUser;
    }

    processedUsers++;
    if (processedUsers % 50 === 0) {
      console.log(`  📊 Progresso: ${processedUsers}/${usersSnap.size} membros processados...`);
    }
  }

  console.log('\n✨ Migração concluída!');
  console.log(`   Membros processados: ${processedUsers}`);
  console.log(`   Eventos criados: ${totalEvents}`);
}

migrate().catch((e) => {
  console.error('❌ Erro durante a migração:', e);
  process.exit(1);
});
