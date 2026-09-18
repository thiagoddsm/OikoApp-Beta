import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { resolveGcReportRecipient } from '@/app/actions/whatsapp-actions';
import { startGcReportSession } from '@/lib/gc-report-bot';

export interface GcQueueItem {
  id: string;
  jobId: string;
  cellId: string;
  cellName: string;
  recipientPhone: string;
  recipientName: string;
  recipientRole: 'secretario' | 'lider';
  recipientUserId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  scheduledFor: Timestamp;
  processedAt?: Timestamp;
  error?: string;
  attempts: number;
  createdAt: Timestamp;
}

export interface GcDispatchJob {
  id: string;
  scope: 'all' | 'rede' | 'area' | 'cell';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  skippedItems: number;
  status: 'queued' | 'running' | 'completed' | 'cancelled';
  delaySeconds: number;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
}

let isWorkerRunning = false;

/**
 * Enfileira disparos de GC com cadência configurável (padrão: 60s por pessoa / 1 pessoa por minuto)
 */
export async function enqueueGcReportsBatch(options: {
  scope: 'all' | 'rede' | 'area' | 'cell';
  redeId?: string;
  areaId?: string;
  cellId?: string;
  force?: boolean;
  delaySeconds?: number;
}) {
  const db = getAdminDb();
  const { scope, redeId, areaId, cellId, force = false, delaySeconds = 60 } = options;

  let cellsRef: any = db.collection('cells');
  let cellsSnap: any;

  if (scope === 'cell' && cellId) {
    const singleDoc = await db.collection('cells').doc(cellId).get();
    if (!singleDoc.exists) {
      return { success: false, error: 'Célula não encontrada.' };
    }
    cellsSnap = { docs: [singleDoc] };
  } else if (scope === 'area' && areaId) {
    cellsSnap = await cellsRef.where('areaId', '==', areaId).get();
  } else if (scope === 'rede' && redeId) {
    cellsSnap = await cellsRef.where('redeId', '==', redeId).get();
  } else {
    cellsSnap = await cellsRef.get();
  }

  if (!cellsSnap || cellsSnap.empty) {
    return {
      success: true,
      message: 'Nenhum GC cadastrado encontrado no escopo selecionado.',
      totalEnqueued: 0
    };
  }

  const now = new Date();
  const jobId = `job_${now.getTime()}_${Math.random().toString(36).substr(2, 6)}`;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const queueItems: any[] = [];
  const processedPhones = new Set<string>(); // Evita enfileirar o mesmo número no mesmo lote simultaneamente

  let queueIndex = 0;
  for (const cDoc of cellsSnap.docs) {
    const cData = cDoc.data();
    const cStatus = cData?.status || 'active';
    const cellName = cData?.nome || cData?.name || `GC ${cDoc.id}`;

    // Apenas células ativas ou em crescimento
    if (cStatus !== 'active' && cStatus !== 'growing') continue;

    const { recipient, error } = await resolveGcReportRecipient(cData, db);
    if (!recipient || !recipient.phone) {
      console.log(`[GC Queue] Célula ${cellName} (${cDoc.id}) ignorada: sem responsável com telefone válido (${error})`);
      continue;
    }

    // Verificar se já existe relatório recente (a menos que force === true)
    if (!force) {
      const existingSnap = await db.collection('reuniao_logs')
        .where('cellId', '==', cDoc.id)
        .get();

      const recentDoc = existingSnap.docs.find(doc => {
        const d = doc.data();
        const logDate = d.date || (d.createdAt?.toDate?.() ? d.createdAt.toDate().toISOString().split('T')[0] : '');
        return logDate >= weekStartStr;
      });

      if (recentDoc) {
        console.log(`[GC Queue] Célula ${cellName} já possui relatório recente esta semana. Pulando.`);
        continue;
      }
    }

    // Se o líder já foi enfileirado para outro GC, adiciona um espaçamento extra para não colidir
    const scheduledTime = new Date(now.getTime() + queueIndex * delaySeconds * 1000);
    queueIndex++;

    queueItems.push({
      jobId,
      cellId: cDoc.id,
      cellName,
      recipientPhone: recipient.phone,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      recipientUserId: recipient.userId,
      status: 'pending',
      scheduledFor: Timestamp.fromDate(scheduledTime),
      attempts: 0,
      createdAt: Timestamp.now()
    });
  }

  if (queueItems.length === 0) {
    return {
      success: true,
      message: 'Todos os GCs selecionados já responderam esta semana ou não possuem telefone cadastrado.',
      totalEnqueued: 0
    };
  }

  // Grava o Job e todos os itens da fila em batch
  const batch = db.batch();
  const jobRef = db.collection('gc_dispatch_jobs').doc(jobId);
  batch.set(jobRef, {
    id: jobId,
    scope,
    totalItems: queueItems.length,
    completedItems: 0,
    failedItems: 0,
    skippedItems: 0,
    status: 'running',
    delaySeconds,
    createdAt: Timestamp.now(),
    startedAt: Timestamp.now()
  });

  queueItems.forEach(item => {
    const itemRef = db.collection('gc_dispatch_queue').doc();
    batch.set(itemRef, { ...item, id: itemRef.id });
  });

  await batch.commit();

  console.log(`[GC Queue] Job ${jobId} criado com ${queueItems.length} itens enfileirados (intervalo: ${delaySeconds}s / 1 envio por minuto).`);

  // Dispara o processador de fila em background sem travar a resposta HTTP
  triggerBackgroundQueueWorker();

  return {
    success: true,
    jobId,
    totalEnqueued: queueItems.length,
    delaySeconds,
    estimatedMinutes: Math.ceil((queueItems.length * delaySeconds) / 60),
    message: `${queueItems.length} disparos enfileirados com sucesso! O servidor enviará 1 mensagem a cada ${delaySeconds}s em segundo plano. Você pode fechar a página com tranquilidade.`
  };
}

/**
 * Inicia o processador de fila em segundo plano no Node.js
 */
export function triggerBackgroundQueueWorker() {
  if (isWorkerRunning) {
    console.log('[GC Queue Worker] Worker já está em execução.');
    return;
  }

  // Execução assíncrona desacoplada
  setImmediate(() => {
    processQueueLoop().catch(err => {
      console.error('[GC Queue Worker] Erro no loop de processamento:', err);
      isWorkerRunning = false;
    });
  });
}

/**
 * Loop contínuo que processa itens da fila respeitando o agendamento de 60s
 */
async function processQueueLoop() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  console.log('[GC Queue Worker] Iniciando processamento da fila de disparos...');
  const db = getAdminDb();

  try {
    while (true) {
      const now = Timestamp.now();

      // Busca próximo item pendente com agendamento <= agora
      const nextSnap = await db.collection('gc_dispatch_queue')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .orderBy('scheduledFor', 'asc')
        .limit(1)
        .get();

      if (nextSnap.empty) {
        // Verifica se ainda existem itens futuros pendentes
        const futureSnap = await db.collection('gc_dispatch_queue')
          .where('status', '==', 'pending')
          .orderBy('scheduledFor', 'asc')
          .limit(1)
          .get();

        if (futureSnap.empty) {
          console.log('[GC Queue Worker] Fila limpa. Nenhum item pendente.');
          break;
        }

        // Aguarda até o próximo item agendado (máximo 60s)
        const nextItem = futureSnap.docs[0].data();
        const waitMs = Math.max(1000, nextItem.scheduledFor.toMillis() - Date.now());
        const waitSeconds = Math.round(waitMs / 1000);
        console.log(`[GC Queue Worker] Próximo item em ${waitSeconds}s (Célula: ${nextItem.cellName}). Aguardando...`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 60000)));
        continue;
      }

      const itemDoc = nextSnap.docs[0];
      const item = itemDoc.data() as GcQueueItem;

      console.log(`[GC Queue Worker] Processando disparo [${item.cellName}] para ${item.recipientName} (${item.recipientPhone})...`);

      // Marca como 'processing'
      await itemDoc.ref.update({
        status: 'processing',
        attempts: (item.attempts || 0) + 1
      });

      let success = false;
      let errorMsg = '';

      try {
        // Dispara a sessão do WhatsApp
        success = await startGcReportSession(
          item.cellId,
          item.recipientPhone,
          false,
          {
            userId: item.recipientUserId,
            name: item.recipientName,
            role: item.recipientRole
          }
        );
      } catch (err: any) {
        success = false;
        errorMsg = err.message || 'Erro desconhecido ao enviar WhatsApp';
      }

      const processedTime = Timestamp.now();

      if (success) {
        console.log(`[GC Queue Worker] ✅ Disparo concluído com sucesso para ${item.cellName} (${item.recipientPhone})`);
        await itemDoc.ref.update({
          status: 'completed',
          processedAt: processedTime
        });

        // Atualiza contadores do Job mestre
        if (item.jobId) {
          const jobRef = db.collection('gc_dispatch_jobs').doc(item.jobId);
          await db.runTransaction(async (t) => {
            const jDoc = await t.get(jobRef);
            if (jDoc.exists) {
              const jData = jDoc.data()!;
              const completed = (jData.completedItems || 0) + 1;
              const isDone = completed + (jData.failedItems || 0) + (jData.skippedItems || 0) >= jData.totalItems;
              t.update(jobRef, {
                completedItems: completed,
                status: isDone ? 'completed' : 'running',
                finishedAt: isDone ? processedTime : undefined
              });
            }
          }).catch(() => {});
        }
      } else {
        console.error(`[GC Queue Worker] ❌ Falha no disparo para ${item.cellName}: ${errorMsg}`);
        const newAttempts = (item.attempts || 0) + 1;
        
        if (newAttempts < 3) {
          // Reagenda tentativa para 2 minutos depois
          const retryTime = new Date(Date.now() + 120 * 1000);
          await itemDoc.ref.update({
            status: 'pending',
            scheduledFor: Timestamp.fromDate(retryTime),
            error: errorMsg
          });
          console.log(`[GC Queue Worker] Item ${item.cellName} reagendado para tentativa ${newAttempts + 1} em 2 minutos.`);
        } else {
          await itemDoc.ref.update({
            status: 'failed',
            error: errorMsg,
            processedAt: processedTime
          });

          if (item.jobId) {
            const jobRef = db.collection('gc_dispatch_jobs').doc(item.jobId);
            await db.runTransaction(async (t) => {
              const jDoc = await t.get(jobRef);
              if (jDoc.exists) {
                const jData = jDoc.data()!;
                const failed = (jData.failedItems || 0) + 1;
                const isDone = (jData.completedItems || 0) + failed + (jData.skippedItems || 0) >= jData.totalItems;
                t.update(jobRef, {
                  failedItems: failed,
                  status: isDone ? 'completed' : 'running',
                  finishedAt: isDone ? processedTime : undefined
                });
              }
            }).catch(() => {});
          }
        }
      }

      // Pequena pausa de segurança antes da próxima verificação
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error('[GC Queue Worker] Erro fatal no worker:', error);
  } finally {
    isWorkerRunning = false;
    console.log('[GC Queue Worker] Worker finalizado.');
  }
}

/**
 * Consulta o status atual da fila / jobs
 */
export async function getQueueStatus(jobId?: string) {
  const db = getAdminDb();
  
  if (jobId) {
    const jobDoc = await db.collection('gc_dispatch_jobs').doc(jobId).get();
    const itemsSnap = await db.collection('gc_dispatch_queue').where('jobId', '==', jobId).get();
    
    return {
      job: jobDoc.exists ? jobDoc.data() : null,
      items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  }

  const pendingSnap = await db.collection('gc_dispatch_queue').where('status', 'in', ['pending', 'processing']).get();
  return {
    isWorkerRunning,
    pendingCount: pendingSnap.size
  };
}
