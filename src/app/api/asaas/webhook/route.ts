import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// Mapa de eventos Asaas → status interno
const EVENT_STATUS_MAP: Record<string, string> = {
  PAYMENT_RECEIVED: 'RECEIVED',
  PAYMENT_CONFIRMED: 'CONFIRMED',
  PAYMENT_OVERDUE: 'OVERDUE',
  PAYMENT_REFUNDED: 'REFUNDED',
  PAYMENT_DELETED: 'DELETED',
  PAYMENT_RESTORED: 'RESTORED',
  PAYMENT_ANTICIPATED: 'ANTICIPATED',
  PAYMENT_AWAITING_RISK_ANALYSIS: 'AWAITING_RISK_ANALYSIS',
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: 'APPROVED_BY_RISK_ANALYSIS',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'REPROVED_BY_RISK_ANALYSIS',
  PAYMENT_CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'AWAITING_CHARGEBACK_REVERSAL',
  PAYMENT_DUNNING_RECEIVED: 'DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED: 'DUNNING_REQUESTED',
  PAYMENT_UPDATED: 'UPDATED',
  PAYMENT_PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  SUBSCRIPTION_CREATED: 'CREATED',
  SUBSCRIPTION_UPDATED: 'UPDATED',
  SUBSCRIPTION_INACTIVATED: 'INACTIVATED',
  SUBSCRIPTION_DELETED: 'DELETED',
  RECEIVABLE_ANTICIPATION_CREDITED: 'ANTICIPATION_CREDITED',
  RECEIVABLE_ANTICIPATION_DENIED: 'ANTICIPATION_DENIED',
};

export async function POST(request: Request) {
  // Validação do token do webhook — busca dinamicamente do Firestore
  const webhookToken = request.headers.get('asaas-access-token');
  
  let expectedToken = 'ibm_webhook_secret_2025'; // Fallback
  try {
    const db = getAdminDb();
    const configSnap = await db.collection('system_settings').doc('finance').get();
    if (configSnap.exists && configSnap.data()?.asaasWebhookToken) {
      expectedToken = configSnap.data()!.asaasWebhookToken;
    }
  } catch (error) {
    console.error('[Asaas Webhook] Erro ao buscar token de validação do Firestore:', error);
  }

  if (webhookToken !== expectedToken) {
    console.warn('[Asaas Webhook] Token inválido ou ausente.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Retornar 200 imediatamente é crucial para o Asaas não desativar o webhook
  // O processamento ocorre de forma assíncrona após o retorno
  const responsePromise = processWebhookEvent(request);

  // Fire-and-forget: não bloquear o retorno
  responsePromise.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Asaas Webhook] Erro no processamento assíncrono:', msg);
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

async function processWebhookEvent(request: Request): Promise<void> {
  let body: { 
    event?: string; 
    payment?: Record<string, any>; 
    subscription?: Record<string, any>;
    anticipation?: Record<string, any>;
  };

  try {
    body = await request.json();
  } catch (parseError: unknown) {
    const msg = parseError instanceof Error ? parseError.message : 'Erro desconhecido';
    console.error('[Asaas Webhook] Falha ao parsear body JSON:', msg);
    return;
  }

  const { event, payment, subscription, anticipation } = body;

  if (!event) {
    console.warn('[Asaas Webhook] Payload inválido — event ausente:', body);
    return;
  }

  const internalStatus = EVENT_STATUS_MAP[event] ?? event;
  const db = getAdminDb();
  const now = Timestamp.now();

  try {
    // 1. Processar Eventos de Cobrança (Payment)
    if (payment && payment.id) {
      const paymentRef = db.collection('asaasPayments').doc(payment.id);
      await paymentRef.set(
        {
          status: internalStatus,
          asaasStatus: payment.status ?? null,
          asaasEvent: event,
          updatedAt: now,
          ...(payment.value !== undefined && { value: payment.value }),
          ...(payment.dueDate !== undefined && { dueDate: payment.dueDate }),
          ...(payment.billingType !== undefined && { billingType: payment.billingType }),
          ...(payment.customer !== undefined && { customer: payment.customer }),
          ...(payment.externalReference !== undefined && {
            externalReference: payment.externalReference,
          }),
          ...(payment.invoiceUrl !== undefined && { invoiceUrl: payment.invoiceUrl }),
          ...(payment.bankSlipUrl !== undefined && { bankSlipUrl: payment.bankSlipUrl }),
          ...(payment.description !== undefined && { description: payment.description }),
        },
        { merge: true }
      );
      console.log(`[Asaas Webhook] Cobrança ${payment.id} atualizada: ${event} → ${internalStatus}`);
    }

    // 2. Processar Eventos de Assinatura (Subscription)
    if (subscription && subscription.id) {
      const subscriptionRef = db.collection('asaasSubscriptions').doc(subscription.id);
      await subscriptionRef.set(
        {
          status: internalStatus,
          asaasStatus: subscription.status ?? null,
          asaasEvent: event,
          updatedAt: now,
          ...(subscription.value !== undefined && { value: subscription.value }),
          ...(subscription.billingType !== undefined && { billingType: subscription.billingType }),
          ...(subscription.cycle !== undefined && { cycle: subscription.cycle }),
          ...(subscription.customer !== undefined && { customer: subscription.customer }),
          ...(subscription.externalReference !== undefined && {
            externalReference: subscription.externalReference,
          }),
          ...(subscription.description !== undefined && { description: subscription.description }),
        },
        { merge: true }
      );
      console.log(`[Asaas Webhook] Assinatura ${subscription.id} atualizada: ${event} → ${internalStatus}`);
    }

    // 3. Processar Eventos de Antecipação (Anticipation)
    if (anticipation && anticipation.id) {
      const anticipationRef = db.collection('asaasAnticipations').doc(anticipation.id);
      await anticipationRef.set(
        {
          status: internalStatus,
          asaasStatus: anticipation.status ?? null,
          asaasEvent: event,
          updatedAt: now,
          ...(anticipation.value !== undefined && { value: anticipation.value }),
          ...(anticipation.fee !== undefined && { fee: anticipation.fee }),
          ...(anticipation.netValue !== undefined && { netValue: anticipation.netValue }),
          ...(anticipation.requestDate !== undefined && { requestDate: anticipation.requestDate }),
        },
        { merge: true }
      );
      console.log(`[Asaas Webhook] Antecipação ${anticipation.id} atualizada: ${event} → ${internalStatus}`);
    }
  } catch (dbError: unknown) {
    const msg = dbError instanceof Error ? dbError.message : 'Erro desconhecido';
    console.error(`[Asaas Webhook] Erro ao atualizar no Firestore para evento ${event}:`, msg);
  }
}
