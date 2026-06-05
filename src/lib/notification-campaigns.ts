import { initializeFirebase } from '@/firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    Timestamp,
} from 'firebase/firestore';
import { getWhatsAppClient, formatWhatsAppNumber, TypeMessage } from '@/lib/whatsapp';

export type CampaignRecipient = {
    userId: string;
    name: string;
    phone: string;
    personalizedMessage: string;
    status: 'pending' | 'sent' | 'failed';
    sentAt?: string;
    error?: string;
};

export type NotificationCampaign = {
    id: string;
    classId: string;
    className: string;
    createdAt: Timestamp;
    status: 'pending' | 'running' | 'paused' | 'done' | 'cancelled' | 'error';
    messageTemplate: string;
    targetFilter: string;
    totalCount: number;
    sentCount: number;
    failedCount: number;
    batchSize: number;
    delayMs: number;
    recipients: CampaignRecipient[];
};

const BATCH_SIZE = 8;
const DELAY_BETWEEN_BATCHES_MS = 18000; // 18 segundos entre lotes
const DELAY_BETWEEN_MESSAGES_MS = 2500;  // 2.5s entre cada mensagem dentro do lote

/**
 * Cria uma nova campanha no Firestore e retorna o ID do documento.
 */
export async function createCampaign(data: {
    classId: string;
    className: string;
    messageTemplate: string;
    targetFilter: string;
    recipients: Omit<CampaignRecipient, 'status'>[];
}): Promise<string> {
    const { firestore } = initializeFirebase();

    const recipients: CampaignRecipient[] = data.recipients.map(r => ({
        ...r,
        status: 'pending',
    }));

    const campaign: Omit<NotificationCampaign, 'id'> = {
        classId: data.classId,
        className: data.className,
        createdAt: Timestamp.now(),
        status: 'pending',
        messageTemplate: data.messageTemplate,
        targetFilter: data.targetFilter,
        totalCount: recipients.length,
        sentCount: 0,
        failedCount: 0,
        batchSize: BATCH_SIZE,
        delayMs: DELAY_BETWEEN_BATCHES_MS,
        recipients,
    };

    const ref = await addDoc(collection(firestore, 'notification_campaigns'), campaign);
    return ref.id;
}

/**
 * Processa uma campanha em lotes, atualizando o Firestore após cada lote.
 * Verifica o status no Firestore a cada lote para respeitar pausa/cancelamento.
 */
export async function processCampaign(
    campaignId: string,
    onProgress?: (sent: number, total: number) => void
): Promise<void> {
    const { firestore } = initializeFirebase();
    const campaignRef = doc(firestore, 'notification_campaigns', campaignId);

    // Marcar como running
    await updateDoc(campaignRef, { status: 'running' });

    const snap = await getDoc(campaignRef);
    if (!snap.exists()) throw new Error('Campanha não encontrada.');

    const campaign = snap.data() as NotificationCampaign;
    const recipients = [...campaign.recipients];

    let sentCount = campaign.sentCount;
    let failedCount = campaign.failedCount;

    // Localizar o próximo índice pendente (suporte a retomada)
    let startIdx = recipients.findIndex(r => r.status === 'pending');
    if (startIdx === -1) {
        await updateDoc(campaignRef, { status: 'done' });
        return;
    }

    let i = startIdx;
    while (i < recipients.length) {
        // Verificar se foi pausado/cancelado antes de cada lote
        const freshSnap = await getDoc(campaignRef);
        const freshStatus = freshSnap.data()?.status;
        if (freshStatus === 'paused' || freshStatus === 'cancelled') {
            return;
        }

        // Processar lote
        const batchEnd = Math.min(i + BATCH_SIZE, recipients.length);

        for (let j = i; j < batchEnd; j++) {
            const recipient = recipients[j];
            if (recipient.status !== 'pending') continue;

            try {
                const formattedPhone = formatWhatsAppNumber(recipient.phone);
                
                const response = await fetch('/api/notifications/proxy-send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: formattedPhone,
                        text: recipient.personalizedMessage,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `HTTP ${response.status}`);
                }

                const result = await response.json();
                
                const isSuccess = result.status === 'success' || result.status === 200 || result.key || result.id || result.messageId || result.data?.id;
                if (!isSuccess) {
                    throw new Error(JSON.stringify(result));
                }

                recipients[j] = {
                    ...recipient,
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                };
                sentCount++;
            } catch (err: any) {
                recipients[j] = {
                    ...recipient,
                    status: 'failed',
                    error: err?.message || err?.toString() || 'Erro desconhecido',
                };
                failedCount++;
            }

            onProgress?.(sentCount, campaign.totalCount);

            // Delay entre mensagens dentro do lote
            if (j < batchEnd - 1) {
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
        }

        // Salvar progresso do lote no Firestore
        await updateDoc(campaignRef, {
            recipients,
            sentCount,
            failedCount,
        });

        i = batchEnd;

        // Verificar de novo antes de aguardar o próximo lote
        const afterSnap = await getDoc(campaignRef);
        const afterStatus = afterSnap.data()?.status;
        if (afterStatus === 'paused' || afterStatus === 'cancelled') {
            return;
        }

        // Aguardar entre lotes (exceto no último)
        if (i < recipients.length) {
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    await updateDoc(campaignRef, { status: 'done' });
}

export async function pauseCampaign(campaignId: string): Promise<void> {
    const { firestore } = initializeFirebase();
    await updateDoc(doc(firestore, 'notification_campaigns', campaignId), { status: 'paused' });
}

export async function cancelCampaign(campaignId: string): Promise<void> {
    const { firestore } = initializeFirebase();
    await updateDoc(doc(firestore, 'notification_campaigns', campaignId), { status: 'cancelled' });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
